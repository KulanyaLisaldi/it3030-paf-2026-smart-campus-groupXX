package com.example.server.service;

import com.example.server.dto.auth.AuthResponse;
import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.dto.auth.SignInRequest;
import com.example.server.dto.auth.SignUpRequest;
import com.example.server.model.User;
import com.example.server.repository.UserRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepo userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean isEmailRegistered(String email) {
        return userRepo.existsByEmail(normalizeEmail(email));
    }

    public AuthResponse register(SignUpRequest request) {
        User user = new User(
            request.getFirstName().trim(),
            request.getLastName().trim(),
            normalizeEmail(request.getEmail()),
            request.getPhoneNumber().trim(),
            passwordEncoder.encode(request.getPassword()),
            Instant.now()
        );

        User savedUser = userRepo.save(user);
        return new AuthResponse("Account created successfully", toUserResponse(savedUser));
    }

    public Optional<AuthResponse> login(SignInRequest request) {
        String email = normalizeEmail(request.getEmail());
        Optional<User> maybeUser = userRepo.findByEmail(email);

        if (maybeUser.isEmpty()) {
            return Optional.empty();
        }

        User user = maybeUser.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return Optional.empty();
        }

        return Optional.of(new AuthResponse("Sign in successful", toUserResponse(user)));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthUserResponse toUserResponse(User user) {
        return new AuthUserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getPhoneNumber()
        );
    }
}
