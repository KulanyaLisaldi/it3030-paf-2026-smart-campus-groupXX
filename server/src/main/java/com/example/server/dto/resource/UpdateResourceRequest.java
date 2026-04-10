package com.example.server.dto.resource;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UpdateResourceRequest {

    @NotBlank(message = "Resource name is required")
    private String name;

    @NotBlank(message = "Resource type is required")
    private String type;

    @NotNull(message = "Capacity is required")
    @Min(value = 0, message = "Capacity must be 0 or greater")
    private Integer capacity;

    @NotBlank(message = "Location is required")
    private String location;

    private String description;
    private String availability;
    private String conflictAction;

    @NotBlank(message = "Status is required")
    private String status;

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public String getLocation() {
        return location;
    }

    public String getDescription() {
        return description;
    }

    public String getAvailability() {
        return availability;
    }

    public String getStatus() {
        return status;
    }

    public String getConflictAction() {
        return conflictAction;
    }
}
