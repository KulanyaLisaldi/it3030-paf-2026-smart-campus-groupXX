package com.example.server.dto.booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class CreateBookingRequest {

    @NotBlank(message = "Resource is required")
    private String resourceId;

    @NotBlank(message = "Booking date is required")
    private String bookingDate;

    @NotBlank(message = "Start time is required")
    private String startTime;

    @NotBlank(message = "End time is required")
    private String endTime;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @Min(value = 0, message = "Expected attendees cannot be negative")
    private Integer expectedAttendees;

    private String additionalNotes;

    public String getResourceId() {
        return resourceId;
    }

    public String getBookingDate() {
        return bookingDate;
    }

    public String getStartTime() {
        return startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public String getPurpose() {
        return purpose;
    }

    public Integer getExpectedAttendees() {
        return expectedAttendees;
    }

    public String getAdditionalNotes() {
        return additionalNotes;
    }
}
