package com.example.server.service;

import com.example.server.dto.booking.CreateBookingRequest;
import com.example.server.dto.booking.AdminBookingRowResponse;
import com.example.server.dto.booking.UpdateMyBookingRequest;
import com.example.server.model.Booking;
import com.example.server.model.Resource;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.BookingRepo;
import com.example.server.repository.ResourceRepo;
import com.example.server.repository.UserRepo;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import com.example.server.dto.booking.BookingCheckInValidationResponse;
import com.example.server.dto.booking.CheckInValidateRequest;
import com.example.server.dto.booking.MyBookingQrResponse;

@Service
public class BookingService {

    private static final List<String> CONFLICT_STATUSES = List.of("PENDING", "APPROVED", "CHECKED_IN");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final BookingRepo bookingRepo;
    private final ResourceRepo resourceRepo;
    private final UserRepo userRepo;
    private final NotificationService notificationService;

    public BookingService(
        BookingRepo bookingRepo,
        ResourceRepo resourceRepo,
        UserRepo userRepo,
        NotificationService notificationService
    ) {
        this.bookingRepo = bookingRepo;
        this.resourceRepo = resourceRepo;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    public Booking createBooking(CreateBookingRequest request, String createdBy) {
        if (createdBy == null || createdBy.isBlank()) {
            throw new IllegalArgumentException("Authenticated user is required");
        }

        String resourceId = safeTrim(request.getResourceId());
        String bookingDate = safeTrim(request.getBookingDate());
        String startTime = safeTrim(request.getStartTime());
        String endTime = safeTrim(request.getEndTime());
        String purpose = safeTrim(request.getPurpose());
        String additionalNotes = safeTrim(request.getAdditionalNotes());

        validateDateAndTime(bookingDate, startTime, endTime);
        if (purpose.isEmpty()) {
            throw new IllegalArgumentException("Purpose is required");
        }

        Resource resource = resourceRepo.findById(resourceId)
            .orElseThrow(() -> new IllegalArgumentException("Selected resource does not exist"));

        if (hasConflict(resourceId, bookingDate, startTime, endTime)) {
            throw new IllegalArgumentException("This resource is already booked for the selected time");
        }

        Integer expectedAttendees = request.getExpectedAttendees();
        if (!"EQUIPMENT".equalsIgnoreCase(safeTrim(resource.getType())) && expectedAttendees == null) {
            throw new IllegalArgumentException("Expected attendees is required for this resource");
        }
        if (expectedAttendees != null && resource.getCapacity() != null && expectedAttendees > resource.getCapacity()) {
            throw new IllegalArgumentException("Expected attendees cannot exceed resource capacity");
        }

        Booking booking = new Booking();
        booking.setResourceId(resource.getId());
        booking.setResourceName(safeTrim(resource.getName()));
        booking.setResourceType(safeTrim(resource.getType()));
        booking.setBookingDate(bookingDate);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setPurpose(purpose);
        booking.setExpectedAttendees(expectedAttendees);
        booking.setAdditionalNotes(additionalNotes);
        booking.setStatus("PENDING");
        booking.setCheckInStatus("NOT_CHECKED_IN");
        booking.setCreatedBy(createdBy.trim());
        booking.setCreatedAt(Instant.now());
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        notificationService.createForRole(
            UserRole.ADMIN,
            "BOOKING_REQUEST_CREATED",
            "New booking request",
            "A new booking request was submitted for " + safeTrim(saved.getResourceName()) + ".",
            "BOOKING",
            safeTrim(saved.getId()),
            "/adminbookings"
        );
        return saved;
    }

    public List<Booking> getMyBookings(String createdBy) {
        rejectExpiredPendingBookings();
        return bookingRepo.findByCreatedByOrderByCreatedAtDesc(createdBy);
    }

    public List<AdminBookingRowResponse> getAllBookingsForAdmin(
        String statusRaw,
        String bookingDateRaw,
        String resourceTypeRaw,
        String resourceRaw,
        String userRaw,
        String approvalStateRaw
    ) {
        rejectExpiredPendingBookings();
        String statusFilter = safeTrim(statusRaw).toUpperCase(Locale.ROOT);
        String dateFilter = safeTrim(bookingDateRaw);
        String resourceTypeFilter = safeTrim(resourceTypeRaw).toUpperCase(Locale.ROOT);
        String resourceFilter = safeTrim(resourceRaw).toLowerCase(Locale.ROOT);
        String userFilter = safeTrim(userRaw).toLowerCase(Locale.ROOT);
        String approvalStateFilter = safeTrim(approvalStateRaw).toUpperCase(Locale.ROOT);

        if (!dateFilter.isEmpty()) {
            try {
                LocalDate.parse(dateFilter);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Date must be in YYYY-MM-DD format");
            }
        }

        List<Booking> bookings = bookingRepo.findAllByOrderByCreatedAtDesc();
        List<User> users = userRepo.findAll();
        Map<String, User> usersById = users.stream()
            .collect(Collectors.toMap(
                u -> safeTrim(u.getId()),
                u -> u,
                (a, b) -> a
            ));
        Map<String, User> usersByEmail = users.stream()
            .collect(Collectors.toMap(
                u -> safeTrim(u.getEmail()).toLowerCase(Locale.ROOT),
                u -> u,
                (a, b) -> a
            ));

        return bookings.stream()
            .filter(b -> matchesStatusFilter(safeTrim(b.getStatus()).toUpperCase(Locale.ROOT), statusFilter))
            .filter(b -> dateFilter.isEmpty() || dateFilter.equals(safeTrim(b.getBookingDate())))
            .filter(b -> resourceTypeFilter.isEmpty() || resourceTypeFilter.equals(safeTrim(b.getResourceType()).toUpperCase(Locale.ROOT)))
            .filter(b -> {
                if (resourceFilter.isEmpty()) return true;
                String rid = safeTrim(b.getResourceId()).toLowerCase(Locale.ROOT);
                String rname = safeTrim(b.getResourceName()).toLowerCase(Locale.ROOT);
                return rid.contains(resourceFilter) || rname.contains(resourceFilter);
            })
            .map(b -> {
                User bookingUser = resolveBookingUser(b, usersById, usersByEmail);
                return new AdminBookingRowResponse(
                    b,
                    userDisplayName(bookingUser),
                    userEmail(bookingUser)
                );
            })
            .filter(row -> {
                if (userFilter.isEmpty()) return true;
                return safeTrim(row.getUserEmail()).toLowerCase(Locale.ROOT).contains(userFilter)
                    || safeTrim(row.getUserName()).toLowerCase(Locale.ROOT).contains(userFilter);
            })
            .filter(row -> matchesApprovalStateFilter(safeTrim(row.getStatus()).toUpperCase(Locale.ROOT), approvalStateFilter))
            .toList();
    }

    public Optional<Booking> cancelMyBooking(String bookingId, String createdBy, String reasonRaw) {
        rejectExpiredPendingBookings();
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Booking booking = maybe.get();
        if (!safeTrim(booking.getCreatedBy()).equals(safeTrim(createdBy))) {
            throw new IllegalArgumentException("You can cancel only your own bookings");
        }
        String reason = safeTrim(reasonRaw);
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"PENDING".equals(status) && !"APPROVED".equals(status)) {
            throw new IllegalArgumentException("Only pending or approved bookings can be cancelled");
        }
        if (hasBookingStarted(booking)) {
            throw new IllegalArgumentException("Past or started bookings cannot be cancelled");
        }
        booking.setStatus("CANCELLED");
        booking.setCancellationReason(reason);
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        notificationService.createForRole(
            UserRole.ADMIN,
            "BOOKING_CANCELLED_BY_USER",
            "Booking cancelled",
            "A user cancelled booking " + safeTrim(saved.getResourceName()) + ".",
            "BOOKING",
            safeTrim(saved.getId()),
            "/adminbookings"
        );
        return Optional.of(saved);
    }

    public Optional<Booking> approveBookingByAdmin(String bookingId, String reasonRaw) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Booking booking = maybe.get();
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"PENDING".equals(status)) {
            throw new IllegalArgumentException("Only pending bookings can be approved");
        }
        booking.setStatus("APPROVED");
        booking.setCheckInStatus("NOT_CHECKED_IN");
        ensureCheckInQr(booking);
        booking.setReviewReason(safeTrim(reasonRaw));
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        resolveUserIdFromRef(saved.getCreatedBy()).ifPresent(ownerId ->
            notificationService.createAndPush(
                ownerId,
                "BOOKING_APPROVED",
                "Booking approved",
                "Your booking for " + safeTrim(saved.getResourceName()) + " was approved.",
                "BOOKING",
                safeTrim(saved.getId()),
                "/account/bookings"
            )
        );
        return Optional.of(saved);
    }

    public Optional<Booking> rejectBookingByAdmin(String bookingId, String reasonRaw) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Booking booking = maybe.get();
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"PENDING".equals(status)) {
            throw new IllegalArgumentException("Only pending bookings can be rejected");
        }
        String reason = safeTrim(reasonRaw);
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Rejection reason is required");
        }
        booking.setStatus("REJECTED");
        booking.setReviewReason(reason);
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        resolveUserIdFromRef(saved.getCreatedBy()).ifPresent(ownerId ->
            notificationService.createAndPush(
                ownerId,
                "BOOKING_REJECTED",
                "Booking rejected",
                "Your booking for " + safeTrim(saved.getResourceName()) + " was rejected.",
                "BOOKING",
                safeTrim(saved.getId()),
                "/account/bookings/history"
            )
        );
        return Optional.of(saved);
    }

    public Optional<Booking> cancelBookingByAdmin(String bookingId, String reasonRaw) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Booking booking = maybe.get();
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(status)) {
            throw new IllegalArgumentException("Only approved bookings can be cancelled");
        }
        String reason = safeTrim(reasonRaw);
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }
        booking.setStatus("CANCELLED");
        booking.setReviewReason(reason);
        booking.setCancellationReason("");
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        resolveUserIdFromRef(saved.getCreatedBy()).ifPresent(ownerId ->
            notificationService.createAndPush(
                ownerId,
                "BOOKING_CANCELLED_BY_ADMIN",
                "Booking cancelled by admin",
                "Your approved booking for " + safeTrim(saved.getResourceName()) + " was cancelled by admin.",
                "BOOKING",
                safeTrim(saved.getId()),
                "/account/bookings/history"
            )
        );
        return Optional.of(saved);
    }

    public boolean deleteCancelledBookingByAdmin(String bookingId) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return false;
        }
        Booking booking = maybe.get();
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"CANCELLED".equals(status) && !"REJECTED".equals(status)) {
            throw new IllegalArgumentException("Only rejected or cancelled bookings can be deleted");
        }
        bookingRepo.deleteById(bookingId);
        return true;
    }

    public Optional<MyBookingQrResponse> getMyBookingQr(String bookingId, String createdBy) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) return Optional.empty();
        Booking booking = maybe.get();
        if (!safeTrim(booking.getCreatedBy()).equals(safeTrim(createdBy))) {
            throw new IllegalArgumentException("You can access only your own booking QR");
        }
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"APPROVED".equals(status) && !"CHECKED_IN".equals(status)) {
            throw new IllegalArgumentException("QR is available only for approved or checked-in bookings");
        }
        ensureCheckInQr(booking);
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        MyBookingQrResponse response = new MyBookingQrResponse();
        response.setBookingId(saved.getId());
        response.setQrValue(saved.getQrValue());
        response.setBookingStatus(saved.getStatus());
        response.setCheckInStatus(defaultCheckInStatus(saved));
        return Optional.of(response);
    }

    public BookingCheckInValidationResponse validateCheckInByAdmin(CheckInValidateRequest request) {
        Booking booking = findBookingFromCheckInRequest(request);
        return validateBookingForCheckIn(booking);
    }

    public BookingCheckInValidationResponse confirmCheckInByAdmin(CheckInValidateRequest request, String adminUserId) {
        Booking booking = findBookingFromCheckInRequest(request);
        BookingCheckInValidationResponse validation = validateBookingForCheckIn(booking);
        if (!validation.isValid()) {
            throw new IllegalArgumentException(validation.getMessage());
        }
        booking.setStatus("CHECKED_IN");
        booking.setCheckInStatus("CHECKED_IN");
        booking.setCheckedInAt(Instant.now());
        booking.setCheckedInBy(safeTrim(adminUserId));
        booking.setVerificationMethod("QR_WEBCAM");
        booking.setUpdatedAt(Instant.now());
        Booking saved = bookingRepo.save(booking);
        BookingCheckInValidationResponse response = toCheckInValidationResponse(saved, "Check-in confirmed successfully");
        response.setValid(true);
        return response;
    }

    public Optional<Booking> updateMyPendingBooking(String bookingId, String createdBy, UpdateMyBookingRequest request) {
        rejectExpiredPendingBookings();
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Booking booking = maybe.get();
        if (!safeTrim(booking.getCreatedBy()).equals(safeTrim(createdBy))) {
            throw new IllegalArgumentException("You can update only your own bookings");
        }
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"PENDING".equals(status)) {
            throw new IllegalArgumentException("Only pending bookings can be updated");
        }
        if (hasBookingStarted(booking)) {
            throw new IllegalArgumentException("Only upcoming bookings can be updated");
        }

        String bookingDate = safeTrim(request.getBookingDate());
        String startTime = safeTrim(request.getStartTime());
        String endTime = safeTrim(request.getEndTime());
        String purpose = safeTrim(request.getPurpose());
        String additionalNotes = safeTrim(request.getAdditionalNotes());

        validateDateAndTime(bookingDate, startTime, endTime);
        if (purpose.isEmpty()) {
            throw new IllegalArgumentException("Purpose is required");
        }

        Resource resource = resourceRepo.findById(safeTrim(booking.getResourceId()))
            .orElseThrow(() -> new IllegalArgumentException("Selected resource does not exist"));

        if (hasConflictExcludingBooking(safeTrim(booking.getId()), safeTrim(booking.getResourceId()), bookingDate, startTime, endTime)) {
            throw new IllegalArgumentException("Selected time slot is not available");
        }

        Integer expectedAttendees = request.getExpectedAttendees();
        if (!"EQUIPMENT".equalsIgnoreCase(safeTrim(resource.getType())) && expectedAttendees == null) {
            throw new IllegalArgumentException("Expected attendees is required for this resource");
        }
        if (expectedAttendees != null && resource.getCapacity() != null && expectedAttendees > resource.getCapacity()) {
            throw new IllegalArgumentException("Expected attendees cannot exceed resource capacity");
        }

        booking.setBookingDate(bookingDate);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setPurpose(purpose);
        booking.setExpectedAttendees(expectedAttendees);
        booking.setAdditionalNotes(additionalNotes);
        booking.setStatus("PENDING");
        booking.setUpdatedAt(Instant.now());
        return Optional.of(bookingRepo.save(booking));
    }

    public boolean isAvailable(String resourceId, String bookingDate, String startTime, String endTime) {
        String rid = safeTrim(resourceId);
        String date = safeTrim(bookingDate);
        String start = safeTrim(startTime);
        String end = safeTrim(endTime);

        validateDateAndTime(date, start, end);
        resourceRepo.findById(rid).orElseThrow(() -> new IllegalArgumentException("Selected resource does not exist"));
        return !hasConflict(rid, date, start, end);
    }

    public List<Booking> getBookedSlots(String resourceId, String bookingDate, String excludeBookingId) {
        String rid = safeTrim(resourceId);
        String date = safeTrim(bookingDate);
        String excludeId = safeTrim(excludeBookingId);
        if (rid.isEmpty()) {
            throw new IllegalArgumentException("Resource is required");
        }
        if (date.isEmpty()) {
            throw new IllegalArgumentException("Booking date is required");
        }
        try {
            LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Booking date must be in YYYY-MM-DD format");
        }
        resourceRepo.findById(rid).orElseThrow(() -> new IllegalArgumentException("Selected resource does not exist"));
        List<Booking> bookings = bookingRepo.findByResourceIdAndBookingDateAndStatusIn(rid, date, CONFLICT_STATUSES);
        if (excludeId.isEmpty()) {
            return bookings;
        }
        return bookings.stream().filter(b -> !excludeId.equals(safeTrim(b.getId()))).toList();
    }

    private boolean hasConflict(String resourceId, String bookingDate, String startTime, String endTime) {
        LocalTime requestedStart = LocalTime.parse(startTime);
        LocalTime requestedEnd = LocalTime.parse(endTime);

        List<Booking> existing = bookingRepo.findByResourceIdAndBookingDateAndStatusIn(
            resourceId,
            bookingDate,
            CONFLICT_STATUSES
        );
        for (Booking booking : existing) {
            LocalTime existingStart = LocalTime.parse(safeTrim(booking.getStartTime()));
            LocalTime existingEnd = LocalTime.parse(safeTrim(booking.getEndTime()));
            boolean overlaps = requestedStart.isBefore(existingEnd) && requestedEnd.isAfter(existingStart);
            if (overlaps) {
                return true;
            }
        }
        return false;
    }

    private boolean hasConflictExcludingBooking(String bookingId, String resourceId, String bookingDate, String startTime, String endTime) {
        LocalTime requestedStart = LocalTime.parse(startTime);
        LocalTime requestedEnd = LocalTime.parse(endTime);

        List<Booking> existing = bookingRepo.findByResourceIdAndBookingDateAndStatusIn(
            resourceId,
            bookingDate,
            CONFLICT_STATUSES
        );
        for (Booking booking : existing) {
            if (safeTrim(booking.getId()).equals(bookingId)) {
                continue;
            }
            LocalTime existingStart = LocalTime.parse(safeTrim(booking.getStartTime()));
            LocalTime existingEnd = LocalTime.parse(safeTrim(booking.getEndTime()));
            boolean overlaps = requestedStart.isBefore(existingEnd) && requestedEnd.isAfter(existingStart);
            if (overlaps) {
                return true;
            }
        }
        return false;
    }

    private void validateDateAndTime(String bookingDate, String startTime, String endTime) {
        try {
            LocalDate.parse(bookingDate);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Booking date must be in YYYY-MM-DD format");
        }

        LocalTime start;
        LocalTime end;
        try {
            start = LocalTime.parse(startTime);
            end = LocalTime.parse(endTime);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Time must be in HH:mm format");
        }

        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("End time must be after start time");
        }
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private void ensureCheckInQr(Booking booking) {
        if (!safeTrim(booking.getCheckInToken()).isEmpty() && !safeTrim(booking.getQrValue()).isEmpty()) {
            return;
        }
        String token = generateCheckInToken();
        booking.setCheckInToken(token);
        booking.setQrValue("BOOKING:" + safeTrim(booking.getId()) + ":" + token);
    }

    private String generateCheckInToken() {
        byte[] bytes = new byte[18];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private Booking findBookingFromCheckInRequest(CheckInValidateRequest request) {
        String bookingId = safeTrim(request == null ? "" : request.getBookingId());
        String qrValue = safeTrim(request == null ? "" : request.getQrValue());
        ParsedQrPayload parsed = parseQrValue(qrValue);
        String effectiveBookingId = bookingId.isEmpty() ? parsed.bookingId : bookingId;
        if (effectiveBookingId.isEmpty()) {
            throw new IllegalArgumentException("Booking ID or QR value is required");
        }
        Booking booking = bookingRepo.findById(effectiveBookingId)
            .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!parsed.token.isEmpty()) {
            ensureCheckInQr(booking);
            if (!parsed.token.equals(safeTrim(booking.getCheckInToken()))) {
                throw new IllegalArgumentException("QR token mismatch");
            }
        }
        if (!qrValue.isEmpty() && parsed.token.isEmpty() && !parsed.bookingId.isEmpty() && !parsed.bookingId.equals(safeTrim(booking.getId()))) {
            throw new IllegalArgumentException("Invalid QR payload");
        }
        return booking;
    }

    private ParsedQrPayload parseQrValue(String qrRaw) {
        String value = safeTrim(qrRaw);
        if (value.isEmpty()) return new ParsedQrPayload("", "");
        String[] parts = value.split(":");
        if (parts.length == 1) return new ParsedQrPayload(parts[0], "");
        if (parts.length == 3 && "BOOKING".equalsIgnoreCase(parts[0])) {
            return new ParsedQrPayload(parts[1], parts[2]);
        }
        throw new IllegalArgumentException("Invalid QR value format");
    }

    private BookingCheckInValidationResponse validateBookingForCheckIn(Booking booking) {
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if ("CHECKED_IN".equals(status) || "CHECKED_IN".equals(defaultCheckInStatus(booking))) {
            return invalidResponse(booking, "Booking is already checked in");
        }
        if ("CANCELLED".equals(status)) {
            return invalidResponse(booking, "Cancelled booking cannot be checked in");
        }
        if ("REJECTED".equals(status)) {
            return invalidResponse(booking, "Rejected booking cannot be checked in");
        }
        if (!"APPROVED".equals(status)) {
            return invalidResponse(booking, "Only approved bookings can be checked in");
        }
        if (!isWithinAllowedCheckInWindow(booking)) {
            return invalidResponse(booking, "Booking is outside the allowed check-in window");
        }
        BookingCheckInValidationResponse response = toCheckInValidationResponse(booking, "Booking is valid for check-in");
        response.setValid(true);
        return response;
    }

    private boolean isWithinAllowedCheckInWindow(Booking booking) {
        try {
            LocalDate bookingDate = LocalDate.parse(safeTrim(booking.getBookingDate()));
            LocalTime start = LocalTime.parse(safeTrim(booking.getStartTime()));
            LocalTime end = LocalTime.parse(safeTrim(booking.getEndTime()));
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime windowStart = LocalDateTime.of(bookingDate, start).minusMinutes(30);
            LocalDateTime windowEnd = LocalDateTime.of(bookingDate, end).plusMinutes(30);
            return !now.isBefore(windowStart) && !now.isAfter(windowEnd);
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private BookingCheckInValidationResponse invalidResponse(Booking booking, String message) {
        BookingCheckInValidationResponse response = toCheckInValidationResponse(booking, message);
        response.setValid(false);
        return response;
    }

    private BookingCheckInValidationResponse toCheckInValidationResponse(Booking booking, String message) {
        User user = resolveSingleBookingUser(booking);
        BookingCheckInValidationResponse response = new BookingCheckInValidationResponse();
        response.setMessage(message);
        response.setBookingId(safeTrim(booking.getId()));
        response.setUserName(userDisplayName(user));
        response.setUserEmail(userEmail(user));
        response.setResourceName(safeTrim(booking.getResourceName()));
        response.setBookingDate(safeTrim(booking.getBookingDate()));
        response.setStartTime(safeTrim(booking.getStartTime()));
        response.setEndTime(safeTrim(booking.getEndTime()));
        response.setBookingStatus(safeTrim(booking.getStatus()));
        response.setCheckInStatus(defaultCheckInStatus(booking));
        response.setPurpose(safeTrim(booking.getPurpose()));
        return response;
    }

    private String defaultCheckInStatus(Booking booking) {
        String checkInStatus = safeTrim(booking.getCheckInStatus());
        if (!checkInStatus.isEmpty()) return checkInStatus;
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        return "CHECKED_IN".equals(status) ? "CHECKED_IN" : "NOT_CHECKED_IN";
    }

    private User resolveSingleBookingUser(Booking booking) {
        String createdBy = safeTrim(booking.getCreatedBy());
        if (createdBy.isEmpty()) return null;
        Optional<User> byId = userRepo.findById(createdBy);
        if (byId.isPresent()) return byId.get();
        return userRepo.findByEmail(createdBy).orElse(null);
    }

    private Optional<String> resolveUserIdFromRef(String userRefRaw) {
        String ref = safeTrim(userRefRaw);
        if (ref.isEmpty()) return Optional.empty();
        Optional<User> byId = userRepo.findById(ref);
        if (byId.isPresent()) return Optional.ofNullable(byId.get().getId());
        return userRepo.findByEmail(ref.toLowerCase(Locale.ROOT)).map(User::getId);
    }

    private static final class ParsedQrPayload {
        private final String bookingId;
        private final String token;

        private ParsedQrPayload(String bookingId, String token) {
            this.bookingId = bookingId == null ? "" : bookingId;
            this.token = token == null ? "" : token;
        }
    }

    @Scheduled(fixedDelay = 60000)
    public void rejectExpiredPendingBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> bookings = bookingRepo.findAllByOrderByCreatedAtDesc();
        for (Booking booking : bookings) {
            String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
            if (!"PENDING".equals(status)) {
                continue;
            }
            if (!hasBookingStarted(booking, now)) {
                continue;
            }
            booking.setStatus("REJECTED");
            booking.setReviewReason("Auto-rejected: booking time has passed without admin decision");
            booking.setUpdatedAt(Instant.now());
            bookingRepo.save(booking);
        }
    }

    private boolean hasBookingStarted(Booking booking) {
        return hasBookingStarted(booking, LocalDateTime.now());
    }

    private boolean hasBookingStarted(Booking booking, LocalDateTime now) {
        String dateRaw = safeTrim(booking.getBookingDate());
        String startRaw = safeTrim(booking.getStartTime());
        if (dateRaw.isEmpty() || startRaw.isEmpty()) {
            return false;
        }
        try {
            LocalDate date = LocalDate.parse(dateRaw);
            LocalTime start = LocalTime.parse(startRaw);
            return !LocalDateTime.of(date, start).isAfter(now);
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private boolean matchesStatusFilter(String status, String filter) {
        if (filter.isEmpty() || "ALL".equals(filter)) return true;
        return status.equals(filter);
    }

    private boolean matchesApprovalStateFilter(String status, String filter) {
        if (filter.isEmpty() || "ALL".equals(filter)) return true;
        return switch (filter) {
            case "PENDING", "UNREVIEWED" -> "PENDING".equals(status);
            case "REVIEWED" -> "APPROVED".equals(status) || "REJECTED".equals(status) || "CHECKED_IN".equals(status);
            case "APPROVED" -> "APPROVED".equals(status);
            case "REJECTED" -> "REJECTED".equals(status);
            case "CANCELLED" -> "CANCELLED".equals(status);
            case "CHECKED_IN" -> "CHECKED_IN".equals(status);
            default -> true;
        };
    }

    private String userDisplayName(User user) {
        if (user == null) return "Unknown User";
        String first = safeTrim(user.getFirstName());
        String last = safeTrim(user.getLastName());
        String full = (first + " " + last).trim();
        return full.isEmpty() ? "Unknown User" : full;
    }

    private String userEmail(User user) {
        return user == null ? "" : safeTrim(user.getEmail());
    }

    private User resolveBookingUser(Booking booking, Map<String, User> usersById, Map<String, User> usersByEmail) {
        String createdBy = safeTrim(booking.getCreatedBy());
        if (createdBy.isEmpty()) return null;

        User byId = usersById.get(createdBy);
        if (byId != null) return byId;

        return usersByEmail.get(createdBy.toLowerCase(Locale.ROOT));
    }
}
