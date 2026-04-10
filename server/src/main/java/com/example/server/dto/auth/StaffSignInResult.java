package com.example.server.dto.auth;

import org.springframework.http.HttpStatus;

/**
 * Result of email/password staff sign-in (admin / technician).
 */
public final class StaffSignInResult {

    private final AuthResponse response;
    private final String errorMessage;
    private final int httpStatus;

    private StaffSignInResult(AuthResponse response, String errorMessage, int httpStatus) {
        this.response = response;
        this.errorMessage = errorMessage;
        this.httpStatus = httpStatus;
    }

    public static StaffSignInResult success(AuthResponse response) {
        return new StaffSignInResult(response, null, HttpStatus.OK.value());
    }

    public static StaffSignInResult invalidCredentials() {
        return new StaffSignInResult(
            null,
            "Invalid email or password, or use Google for campus accounts",
            HttpStatus.UNAUTHORIZED.value()
        );
    }

    public static StaffSignInResult technicianEmailNotVerified() {
        return new StaffSignInResult(
            null,
            "Please verify your email before signing in. Check your inbox for the CampusSync verification link.",
            HttpStatus.FORBIDDEN.value()
        );
    }

    public boolean isSuccess() {
        return response != null;
    }

    public AuthResponse getResponse() {
        return response;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
