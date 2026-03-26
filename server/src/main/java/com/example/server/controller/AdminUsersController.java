package com.example.server.controller;

import com.example.server.dto.admin.AdminEditUserProfileRequest;
import com.example.server.dto.admin.AdminRoleChangeRequest;
import com.example.server.dto.admin.AdminSetUserStatusRequest;
import com.example.server.dto.admin.AdminUserRowResponse;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import java.util.Optional;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@Validated
public class AdminUsersController {

    private final UserRepo userRepo;

    public AdminUsersController(UserRepo userRepo) {
        this.userRepo = userRepo;
    }

    @GetMapping
    public ResponseEntity<?> listAllUsers(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Unauthorized"));
        }

        List<User> users = userRepo.findAll()
            .stream()
            .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();

        List<AdminUserRowResponse> rows = users.stream().map(this::toRow).toList();
        return ResponseEntity.ok(rows);
    }

    private AdminUserRowResponse toRow(User u) {
        String role = u.getEffectiveRole().name();
        String provider = (u.getGoogleSubject() != null && !u.getGoogleSubject().isBlank()) ? "Google OAuth" : "Email";
        String accountStatus = u.isDisabled() ? "Disabled" : "Active";

        String firstName = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String lastName = u.getLastName() == null ? "" : u.getLastName().trim();
        String name = (firstName + " " + lastName).trim();

        return new AdminUserRowResponse(
            u.getId(),
            firstName,
            lastName,
            name,
            u.getEmail(),
            u.getPhoneNumber(),
            role,
            accountStatus,
            provider,
            u.getCreatedAt(),
            u.getLastLoginAt()
        );
    }

    @PatchMapping("/{userId}/profile")
    public ResponseEntity<?> updateUserProfile(
        Authentication authentication,
        @PathVariable String userId,
        @Valid @RequestBody AdminEditUserProfileRequest request
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Unauthorized"));
        }

        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(java.util.Map.of("message", "User not found"));
        }

        User user = maybe.get();
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());

        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim();
            user.setPhoneNumber(phone.isBlank() ? "" : phone);
        }

        userRepo.save(user);
        return ResponseEntity.ok(toRow(user));
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<?> changeUserRole(
        Authentication authentication,
        @PathVariable String userId,
        @Valid @RequestBody AdminRoleChangeRequest request
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Unauthorized"));
        }

        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(java.util.Map.of("message", "User not found"));
        }

        User user = maybe.get();
        UserRole newRole = request.getRole();
        user.setRole(newRole);
        if (newRole != UserRole.TECHNICIAN) {
            user.setTechnicianCategory(null);
        }
        userRepo.save(user);
        return ResponseEntity.ok(toRow(user));
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<?> setUserDisabled(
        Authentication authentication,
        @PathVariable String userId,
        @Valid @RequestBody AdminSetUserStatusRequest request
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Unauthorized"));
        }

        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(java.util.Map.of("message", "User not found"));
        }

        User user = maybe.get();
        user.setDisabled(Boolean.TRUE.equals(request.getDisabled()));
        userRepo.save(user);
        return ResponseEntity.ok(toRow(user));
    }
}

