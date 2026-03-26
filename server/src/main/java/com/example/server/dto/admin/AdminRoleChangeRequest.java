package com.example.server.dto.admin;

import com.example.server.model.UserRole;
import jakarta.validation.constraints.NotNull;

public class AdminRoleChangeRequest {

    @NotNull(message = "Role is required")
    private UserRole role;

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }
}

