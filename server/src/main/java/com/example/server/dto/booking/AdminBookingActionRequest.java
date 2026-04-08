package com.example.server.dto.booking;

import jakarta.validation.constraints.Size;

public class AdminBookingActionRequest {

    @Size(max = 500, message = "Reason must be 500 characters or less")
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
