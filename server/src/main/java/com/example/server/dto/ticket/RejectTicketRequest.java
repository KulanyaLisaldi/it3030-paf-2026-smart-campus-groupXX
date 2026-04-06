package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RejectTicketRequest {

    @NotBlank(message = "Rejection reason is required")
    @Size(max = 2000)
    @Pattern(
        regexp = "^[a-zA-Z0-9\\s]+$",
        message = "Rejection reason cannot contain special characters"
    )
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
