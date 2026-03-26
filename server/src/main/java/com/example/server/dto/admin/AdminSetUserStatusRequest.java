package com.example.server.dto.admin;

import jakarta.validation.constraints.NotNull;

public class AdminSetUserStatusRequest {

    @NotNull(message = "Disabled is required")
    private Boolean disabled;

    public Boolean getDisabled() {
        return disabled;
    }

    public void setDisabled(Boolean disabled) {
        this.disabled = disabled;
    }
}

