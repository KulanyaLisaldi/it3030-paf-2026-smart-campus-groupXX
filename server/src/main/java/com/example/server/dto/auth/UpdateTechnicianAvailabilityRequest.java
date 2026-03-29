package com.example.server.dto.auth;

import jakarta.validation.constraints.NotNull;

public class UpdateTechnicianAvailabilityRequest {

    @NotNull(message = "Availability is required")
    private Boolean available;

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }
}
