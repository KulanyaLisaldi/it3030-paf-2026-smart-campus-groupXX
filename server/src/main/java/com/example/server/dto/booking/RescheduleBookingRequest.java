package com.example.server.dto.booking;

import jakarta.validation.constraints.NotBlank;

public class RescheduleBookingRequest {

    @NotBlank(message = "Booking date is required")
    private String bookingDate;

    @NotBlank(message = "Start time is required")
    private String startTime;

    @NotBlank(message = "End time is required")
    private String endTime;

    private String reason;

    public String getBookingDate() {
        return bookingDate;
    }

    public String getStartTime() {
        return startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public String getReason() {
        return reason;
    }
}
