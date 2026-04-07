package com.example.server.service;

import com.example.server.dto.booking.CreateBookingRequest;
import com.example.server.model.Booking;
import com.example.server.model.Resource;
import com.example.server.repository.BookingRepo;
import com.example.server.repository.ResourceRepo;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class BookingService {

    private static final List<String> CONFLICT_STATUSES = List.of("PENDING", "APPROVED");

    private final BookingRepo bookingRepo;
    private final ResourceRepo resourceRepo;

    public BookingService(BookingRepo bookingRepo, ResourceRepo resourceRepo) {
        this.bookingRepo = bookingRepo;
        this.resourceRepo = resourceRepo;
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

    public boolean isAvailable(String resourceId, String bookingDate, String startTime, String endTime) {
        String rid = safeTrim(resourceId);
        String date = safeTrim(bookingDate);
        String start = safeTrim(startTime);
        String end = safeTrim(endTime);

        validateDateAndTime(date, start, end);
        resourceRepo.findById(rid).orElseThrow(() -> new IllegalArgumentException("Selected resource does not exist"));
        return !hasConflict(rid, date, start, end);
    }

    public List<Booking> getBookedSlots(String resourceId, String bookingDate) {
        String rid = safeTrim(resourceId);
        String date = safeTrim(bookingDate);
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
        return bookingRepo.findByResourceIdAndBookingDateAndStatusIn(rid, date, CONFLICT_STATUSES);
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
}
