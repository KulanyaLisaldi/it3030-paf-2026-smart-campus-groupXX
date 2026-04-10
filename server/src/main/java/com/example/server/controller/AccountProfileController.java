package com.example.server.controller;

import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.dto.auth.ChangePasswordRequest;
import com.example.server.dto.auth.UpdateNotificationPreferencesRequest;
import com.example.server.dto.auth.UpdateProfileRequest;
import com.example.server.dto.auth.UpdateTechnicianAvailabilityRequest;
import com.example.server.dto.auth.VerifyPasswordChangeRequest;
import com.example.server.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth/profile")
public class AccountProfileController {

    private final AuthService authService;

    public AccountProfileController(AuthService authService) {
        this.authService = authService;
    }

    @PatchMapping(value = "/notification-preferences", consumes = "application/json")
    public ResponseEntity<?> updateNotificationPreferences(
        Authentication authentication,
        @Valid @RequestBody UpdateNotificationPreferencesRequest request
    ) {
        String userId = authentication.getName();
        try {
            return authService.updateNotificationPreferences(userId, request)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found")));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @PatchMapping(consumes = "application/json")
    public ResponseEntity<?> updatePhone(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        String userId = authentication.getName();
        Optional<AuthUserResponse> updated = authService.updatePhone(userId, request);
        if (updated.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(updated.get());
    }

    @PatchMapping(value = "/technician-availability", consumes = "application/json")
    public ResponseEntity<?> updateTechnicianAvailability(
        Authentication authentication,
        @Valid @RequestBody UpdateTechnicianAvailabilityRequest request
    ) {
        String userId = authentication.getName();
        try {
            Optional<AuthUserResponse> updated =
                authService.updateTechnicianAvailability(userId, Boolean.TRUE.equals(request.getAvailable()));
            if (updated.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(updated.get());
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @PatchMapping(value = "/password", consumes = "application/json")
    public ResponseEntity<?> requestPasswordChangeOtp(
        Authentication authentication,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        String userId = authentication.getName();
        try {
            boolean requested = authService.requestPasswordChangeOtp(userId, request);
            if (!requested) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(Map.of("message", "Verification code sent to your email"));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @PatchMapping(value = "/password/verify", consumes = "application/json")
    public ResponseEntity<?> verifyPasswordChangeOtp(
        Authentication authentication,
        @Valid @RequestBody VerifyPasswordChangeRequest request
    ) {
        String userId = authentication.getName();
        try {
            boolean verified = authService.verifyPasswordChangeOtp(userId, request);
            if (!verified) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
        Authentication authentication,
        @RequestParam("file") MultipartFile file
    ) throws IOException {
        String userId = authentication.getName();
        try {
            Optional<AuthUserResponse> updated = authService.updateProfileAvatar(userId, file);
            if (updated.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(updated.get());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<?> removeAvatar(Authentication authentication) {
        String userId = authentication.getName();
        Optional<AuthUserResponse> updated = authService.removeProfileAvatar(userId);
        if (updated.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(updated.get());
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAccount(Authentication authentication) {
        String userId = authentication.getName();
        try {
            boolean deleted = authService.deleteAccount(userId);
            if (!deleted) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(Map.of("message", "Account deleted"));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason()));
        }
    }
}
