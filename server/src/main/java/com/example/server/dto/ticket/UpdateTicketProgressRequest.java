package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UpdateTicketProgressRequest {

    @NotBlank(message = "Status is required")
    @Pattern(
        regexp = "^(?i)(IN_PROGRESS|RESOLVED)$",
        message = "Status must be IN_PROGRESS or RESOLVED"
    )
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
