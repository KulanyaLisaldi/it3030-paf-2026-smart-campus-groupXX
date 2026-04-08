package com.example.server.controller;

import com.example.server.dto.booking.CreateBookingRequest;
import com.example.server.dto.booking.CancelBookingRequest;
import com.example.server.dto.booking.AdminBookingActionRequest;
import com.example.server.dto.booking.AdminBookingRowResponse;
import com.example.server.dto.booking.BookingCheckInValidationResponse;
import com.example.server.dto.booking.CheckInValidateRequest;
import com.example.server.dto.booking.UpdateMyBookingRequest;
import com.example.server.model.Booking;
import com.example.server.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.DeleteMapping;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<?> createBooking(
        Authentication authentication,
        @Valid @RequestBody CreateBookingRequest request
    ) {
        Booking booking = bookingService.createBooking(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message", "Booking request submitted successfully",
                "booking", booking
            )
        );
    }

    @GetMapping("/my")
    public List<Booking> getMyBookings(Authentication authentication) {
        return bookingService.getMyBookings(authentication.getName());
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<?> getMyBookingQr(
        Authentication authentication,
        @PathVariable("id") String id
    ) {
        return bookingService.getMyBookingQr(id, authentication.getName())
            .<ResponseEntity<?>>map(qr -> ResponseEntity.ok(Map.of("message", "QR value generated successfully", "data", qr)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found")));
    }

    @GetMapping("/admin")
    public List<AdminBookingRowResponse> getAllBookingsForAdmin(
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "date", required = false) String date,
        @RequestParam(value = "resourceType", required = false) String resourceType,
        @RequestParam(value = "resource", required = false) String resource,
        @RequestParam(value = "user", required = false) String user,
        @RequestParam(value = "approvalState", required = false) String approvalState
    ) {
        return bookingService.getAllBookingsForAdmin(status, date, resourceType, resource, user, approvalState);
    }

    @RequestMapping(value = "/admin/{id}/approve", method = {RequestMethod.PATCH, RequestMethod.POST})
    public ResponseEntity<?> approveBookingByAdmin(
        @PathVariable("id") String id,
        @Valid @RequestBody(required = false) AdminBookingActionRequest request
    ) {
        String reason = request == null ? "" : request.getReason();
        return bookingService.approveBookingByAdmin(id, reason)
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Booking approved successfully", "booking", updated)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found")));
    }

    @RequestMapping(value = "/admin/{id}/reject", method = {RequestMethod.PATCH, RequestMethod.POST})
    public ResponseEntity<?> rejectBookingByAdmin(
        @PathVariable("id") String id,
        @Valid @RequestBody AdminBookingActionRequest request
    ) {
        return bookingService.rejectBookingByAdmin(id, request.getReason())
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Booking rejected successfully", "booking", updated)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found")));
    }

    @RequestMapping(value = "/admin/{id}/cancel", method = {RequestMethod.PATCH, RequestMethod.POST})
    public ResponseEntity<?> cancelBookingByAdmin(
        @PathVariable("id") String id,
        @Valid @RequestBody AdminBookingActionRequest request
    ) {
        return bookingService.cancelBookingByAdmin(id, request.getReason())
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Booking cancelled successfully", "booking", updated)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found")));
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> deleteCancelledBookingByAdmin(@PathVariable("id") String id) {
        boolean deleted = bookingService.deleteCancelledBookingByAdmin(id);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Cancelled booking deleted successfully"));
    }

    @PostMapping("/admin/checkin/validate")
    public ResponseEntity<?> validateCheckInByAdmin(
        @Valid @RequestBody CheckInValidateRequest request
    ) {
        BookingCheckInValidationResponse response = bookingService.validateCheckInByAdmin(request);
        return ResponseEntity.ok(Map.of("message", response.getMessage(), "data", response));
    }

    @PostMapping("/admin/checkin/confirm")
    public ResponseEntity<?> confirmCheckInByAdmin(
        Authentication authentication,
        @Valid @RequestBody CheckInValidateRequest request
    ) {
        BookingCheckInValidationResponse response = bookingService.confirmCheckInByAdmin(request, authentication.getName());
        return ResponseEntity.ok(Map.of("message", response.getMessage(), "data", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateMyBooking(
        Authentication authentication,
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateMyBookingRequest request
    ) {
        return bookingService.updateMyPendingBooking(id, authentication.getName(), request)
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Booking updated successfully", "booking", updated)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found")));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancelMyBooking(
        Authentication authentication,
        @PathVariable("id") String id,
        @Valid @RequestBody CancelBookingRequest request
    ) {
        return bookingService.cancelMyBooking(id, authentication.getName(), request.getReason())
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Booking cancelled successfully", "booking", updated)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found")));
    }

    @GetMapping("/availability")
    public ResponseEntity<?> checkAvailability(
        @RequestParam("resourceId") String resourceId,
        @RequestParam("bookingDate") String bookingDate,
        @RequestParam("startTime") String startTime,
        @RequestParam("endTime") String endTime
    ) {
        boolean available = bookingService.isAvailable(resourceId, bookingDate, startTime, endTime);
        if (!available) {
            return ResponseEntity.ok(
                Map.of(
                    "available", false,
                    "message", "This resource is already booked for the selected time"
                )
            );
        }
        return ResponseEntity.ok(
            Map.of(
                "available", true,
                "message", "Resource is available for the selected time"
            )
        );
    }

    @GetMapping("/slots")
    public ResponseEntity<?> getBookedSlots(
        @RequestParam("resourceId") String resourceId,
        @RequestParam("bookingDate") String bookingDate,
        @RequestParam(value = "excludeBookingId", required = false) String excludeBookingId
    ) {
        List<Booking> bookings = bookingService.getBookedSlots(resourceId, bookingDate, excludeBookingId);
        List<Map<String, String>> bookedSlots = bookings.stream()
            .map(b -> Map.of(
                "startTime", b.getStartTime() == null ? "" : b.getStartTime(),
                "endTime", b.getEndTime() == null ? "" : b.getEndTime()
            ))
            .toList();
        return ResponseEntity.ok(Map.of("bookedSlots", bookedSlots));
    }
}
