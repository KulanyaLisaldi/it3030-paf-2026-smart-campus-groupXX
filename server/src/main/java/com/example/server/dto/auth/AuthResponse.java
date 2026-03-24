package com.example.server.dto.auth;

public class AuthResponse {

    private String message;
    private AuthUserResponse user;
    /** Present for staff email/password sign-in (ADMIN, TECHNICIAN). */
    private String token;

    public AuthResponse() {
    }

    public AuthResponse(String message, AuthUserResponse user) {
        this.message = message;
        this.user = user;
    }

    public AuthResponse(String message, AuthUserResponse user, String token) {
        this.message = message;
        this.user = user;
        this.token = token;
    }

    public String getMessage() {
        return message;
    }

    public AuthUserResponse getUser() {
        return user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
