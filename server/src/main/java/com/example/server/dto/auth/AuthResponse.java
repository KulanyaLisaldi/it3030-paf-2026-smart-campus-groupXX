package com.example.server.dto.auth;

public class AuthResponse {

    private String message;
    private AuthUserResponse user;

    public AuthResponse() {
    }

    public AuthResponse(String message, AuthUserResponse user) {
        this.message = message;
        this.user = user;
    }

    public String getMessage() {
        return message;
    }

    public AuthUserResponse getUser() {
        return user;
    }
}
