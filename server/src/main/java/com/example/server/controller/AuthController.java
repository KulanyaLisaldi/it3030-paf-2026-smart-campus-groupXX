package com.example.server.controller;

import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.dto.auth.CompleteForgotPasswordRequest;
import com.example.server.dto.auth.ForgotPasswordRequest;
import com.example.server.dto.auth.SignInRequest;
import com.example.server.dto.auth.StaffSignInResult;
import com.example.server.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final String frontendUrl;

    public AuthController(
        AuthService authService,
        @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl
    ) {
        this.authService = authService;
        this.frontendUrl = frontendUrl;
    }

    @PostMapping("/signin")
    public ResponseEntity<?> signIn(@Valid @RequestBody SignInRequest request) {
        StaffSignInResult result = authService.staffLogin(request);
        if (!result.isSuccess()) {
            return ResponseEntity
                .status(result.getHttpStatus())
                .body(Map.of("message", result.getErrorMessage()));
        }
        return ResponseEntity.ok(result.getResponse());
    }

    /**
     * Public link from the technician invitation email. Validates the token, marks the email verified, then redirects to the SPA sign-in page.
     */
    @GetMapping("/verify-technician")
    public void verifyTechnician(
        @RequestParam(required = false) String token,
        HttpServletResponse response
    ) throws IOException {
        String base = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        if (token == null || token.isBlank()) {
            response.sendRedirect(base + "/signin?verificationError=missing_token");
            return;
        }
        try {
            authService.verifyTechnicianEmailFromToken(token.trim());
            response.sendRedirect(base + "/signin");
        } catch (ResponseStatusException ex) {
            if (ex.getStatusCode().equals(HttpStatus.GONE)) {
                response.sendRedirect(base + "/signin?verificationError=expired");
            } else {
                response.sendRedirect(base + "/signin?verificationError=invalid");
            }
        }
    }

    /**
     * Admin/technician email accounts only. Always returns a generic success message when the request is valid
     * to avoid leaking whether an email is registered.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestForgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of(
            "message",
            "If a staff account exists for that email, we sent a verification code. Check your inbox."
        ));
    }

    @PostMapping("/forgot-password/complete")
    public ResponseEntity<Map<String, String>> completeForgotPassword(@Valid @RequestBody CompleteForgotPasswordRequest request) {
        authService.completeForgotPassword(request.getEmail(), request.getCode(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Your password was updated. You can sign in now."));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String userId = authentication.getName();
        return authService.profileForUserId(userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
}
