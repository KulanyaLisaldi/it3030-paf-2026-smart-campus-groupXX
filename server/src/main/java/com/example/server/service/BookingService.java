package com.example.server.service;

import com.example.server.dto.booking.CreateBookingRequest;
import com.example.server.dto.booking.AdminBookingRowResponse;
import com.example.server.dto.booking.UpdateMyBookingRequest;
import com.example.server.model.Booking;
import com.example.server.model.Resource;
import com.example.server.model.User;
import com.example.server.repository.BookingRepo;
import com.example.server.repository.ResourceRepo;
import com.example.server.repository.UserRepo;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final List<String> CONFLICT_STATUSES = List.of("PENDING", "APPROVED");

    private final BookingRepo bookingRepo;
    private final ResourceRepo resourceRepo;
    private final UserRepo userRepo;

    public BookingService(BookingRepo bookingRepo, ResourceRepo resourceRepo, UserRepo userRepo) {
        this.bookingRepo = bookingRepo;
        this.resourceRepo = resourceRepo;
        this.userRepo = userRepo;
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
        booking.setCreatedBy(createdBy.trim());
        booking.setCreatedAt(Instant.now());
        booking.setUpdatedAt(Instant.now());
        return bookingRepo.save(booking);
    }

    public List<Booking> getMyBookings(String createdBy) {
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
        booking.setStatus("CANCELLED");
        booking.setCancellationReason(reason);
        booking.setUpdatedAt(Instant.now());
        return Optional.of(bookingRepo.save(booking));
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
        booking.setReviewReason(safeTrim(reasonRaw));
        booking.setUpdatedAt(Instant.now());
        return Optional.of(bookingRepo.save(booking));
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
        return Optional.of(bookingRepo.save(booking));
    }

    public Optional<Booking> cancelBookingByAdmin(String bookingId, String reasonRaw) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Booking booking = maybe.get();
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"PENDING".equals(status) && !"APPROVED".equals(status)) {
            throw new IllegalArgumentException("Only pending or approved bookings can be cancelled");
        }
        String reason = safeTrim(reasonRaw);
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Cancellation reason is required");
        }
        booking.setStatus("CANCELLED");
        booking.setReviewReason(reason);
        booking.setCancellationReason("");
        booking.setUpdatedAt(Instant.now());
        return Optional.of(bookingRepo.save(booking));
    }

    public boolean deleteCancelledBookingByAdmin(String bookingId) {
        Optional<Booking> maybe = bookingRepo.findById(bookingId);
        if (maybe.isEmpty()) {
            return false;
        }
        Booking booking = maybe.get();
        String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
        if (!"CANCELLED".equals(status)) {
            throw new IllegalArgumentException("Only cancelled bookings can be deleted");
        }
        bookingRepo.deleteById(bookingId);
        return true;
    }

    public Optional<Booking> updateMyPendingBooking(String bookingId, String createdBy, UpdateMyBookingRequest request) {
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

    private boolean matchesStatusFilter(String status, String filter) {
        if (filter.isEmpty() || "ALL".equals(filter)) return true;
        return status.equals(filter);
    }

    private boolean matchesApprovalStateFilter(String status, String filter) {
        if (filter.isEmpty() || "ALL".equals(filter)) return true;
        return switch (filter) {
            case "PENDING", "UNREVIEWED" -> "PENDING".equals(status);
            case "REVIEWED" -> "APPROVED".equals(status) || "REJECTED".equals(status);
            case "APPROVED" -> "APPROVED".equals(status);
            case "REJECTED" -> "REJECTED".equals(status);
            case "CANCELLED" -> "CANCELLED".equals(status);
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
