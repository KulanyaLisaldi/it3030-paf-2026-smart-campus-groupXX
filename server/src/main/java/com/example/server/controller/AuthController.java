package com.example.server.controller;

import com.example.server.dto.auth.AuthResponse;
import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.dto.auth.CompleteForgotPasswordRequest;
import com.example.server.dto.auth.ForgotPasswordRequest;
import com.example.server.dto.auth.SignInRequest;
import com.example.server.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signin")
    public ResponseEntity<?> signIn(@Valid @RequestBody SignInRequest request) {
        Optional<AuthResponse> response = authService.login(request);

        if (response.isEmpty()) {
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid email or password, or use Google for campus accounts"));
        }

        return ResponseEntity.ok(response.get());
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
