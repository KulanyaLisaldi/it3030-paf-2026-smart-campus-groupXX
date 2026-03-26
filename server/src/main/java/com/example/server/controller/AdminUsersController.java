package com.example.server.controller;

import com.example.server.dto.admin.AdminUserRowResponse;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
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
        String accountStatus = "Active"; // Placeholder (disable support is not implemented yet)

        return new AdminUserRowResponse(
            u.getId(),
            ((u.getFirstName() == null ? "" : u.getFirstName()).trim() + " " + (u.getLastName() == null ? "" : u.getLastName()).trim()).trim(),
            u.getEmail(),
            role,
            accountStatus,
            provider,
            u.getCreatedAt(),
            null // lastLogin not tracked yet
        );
    }
}

