package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class UpdateTicketProgressRequest {

    @NotBlank(message = "Status is required")
    @Pattern(
        regexp = "^(?i)(IN_PROGRESS|RESOLVED)$",
        message = "Status must be IN_PROGRESS or RESOLVED"
    )
    private String status;

    @Size(max = 4000, message = "Resolution details must be at most 4000 characters")
    private String resolutionDetails;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getResolutionDetails() {
        return resolutionDetails;
    }

    public void setResolutionDetails(String resolutionDetails) {
        this.resolutionDetails = resolutionDetails;
    }
}
