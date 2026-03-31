package com.example.server.dto.resource;

import jakarta.validation.constraints.NotBlank;

public class UpdateResourceStatusRequest {

    @NotBlank(message = "Status is required")
    private String status;

    public String getStatus() {
        return status;
    }
}
