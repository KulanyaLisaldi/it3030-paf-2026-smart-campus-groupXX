package com.example.server.dto.admin;

import java.time.Instant;

public class AdminUserRowResponse {

    private String userId;
    private String name;
    private String email;
    private String role;
    private String accountStatus;
    private String provider;
    private Instant createdDate;
    private Instant lastLogin;

    public AdminUserRowResponse() {
    }

    public AdminUserRowResponse(
        String userId,
        String name,
        String email,
        String role,
        String accountStatus,
        String provider,
        Instant createdDate,
        Instant lastLogin
    ) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.accountStatus = accountStatus;
        this.provider = provider;
        this.createdDate = createdDate;
        this.lastLogin = lastLogin;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getAccountStatus() {
        return accountStatus;
    }

    public String getProvider() {
        return provider;
    }

    public Instant getCreatedDate() {
        return createdDate;
    }

    public Instant getLastLogin() {
        return lastLogin;
    }
}

