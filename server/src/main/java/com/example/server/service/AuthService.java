package com.example.server.service;

import com.example.server.dto.admin.CreateTechnicianRequest;
import com.example.server.dto.auth.AuthResponse;
import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.dto.auth.SignInRequest;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.UserRepo;
import com.example.server.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepo userRepo, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Email/password sign-in for {@link UserRole#ADMIN} and {@link UserRole#TECHNICIAN} only.
     * Regular {@link UserRole#USER} accounts must use Google.
     */
    public Optional<AuthResponse> login(SignInRequest request) {
        String email = normalizeEmail(request.getEmail());
        Optional<User> maybeUser = userRepo.findByEmail(email);

        if (maybeUser.isEmpty()) {
            return Optional.empty();
        }

        User user = maybeUser.get();
        UserRole effective = user.getEffectiveRole();
        if (effective != UserRole.ADMIN && effective != UserRole.TECHNICIAN) {
            return Optional.empty();
        }

        String hash = user.getPasswordHash();
        if (hash == null || hash.isBlank()) {
            return Optional.empty();
        }
        if (!passwordEncoder.matches(request.getPassword(), hash)) {
            return Optional.empty();
        }

        AuthUserResponse profile = toUserResponse(user);
        AuthResponse response = new AuthResponse("Sign in successful", profile);
        response.setToken(jwtService.generateToken(user));
        return Optional.of(response);
    }

    public AuthUserResponse createTechnician(CreateTechnicianRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepo.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        String phone = request.getPhoneNumber() == null ? "" : request.getPhoneNumber().trim();
        User user = new User(
            request.getFirstName().trim(),
            request.getLastName().trim(),
            email,
            phone,
            passwordEncoder.encode(request.getPassword()),
            Instant.now()
        );
        user.setRole(UserRole.TECHNICIAN);
        User saved = userRepo.save(user);
        return toUserResponse(saved);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Finds or creates a {@link UserRole#USER} from Google OAuth profile attributes.
     */
    public User syncUserFromGoogleOAuth(OAuth2User oauth2User) {
        String sub = oauth2User.getAttribute("sub");
        String email = oauth2User.getAttribute("email");
        if (sub == null || sub.isBlank() || email == null || email.isBlank()) {
            throw new IllegalStateException("Google account did not return a stable id or email");
        }
        Boolean verified = oauth2User.getAttribute("email_verified");
        if (Boolean.FALSE.equals(verified)) {
            throw new IllegalStateException("Google email is not verified");
        }

        String normalizedEmail = normalizeEmail(email);
        String given = oauth2User.getAttribute("given_name");
        String family = oauth2User.getAttribute("family_name");
        String firstName = (given != null && !given.isBlank()) ? given.trim() : extractFirstName(oauth2User);
        String lastName = (family != null && !family.isBlank()) ? family.trim() : extractLastName(oauth2User);

        return userRepo.findByGoogleSubject(sub)
            .map(existing -> ensureUserRole(updateProfileIfNeeded(existing, firstName, lastName, normalizedEmail)))
            .orElseGet(() -> userRepo.findByEmail(normalizedEmail)
                .map(existing -> linkGoogleToExistingUser(existing, sub, firstName, lastName))
                .orElseGet(() -> createGoogleUser(sub, normalizedEmail, firstName, lastName)));
    }

    private User ensureUserRole(User user) {
        if (user.getEffectiveRole() != UserRole.USER) {
            throw new IllegalStateException("This Google account is linked to a staff profile. Use email and password.");
        }
        return user;
    }

    private User updateProfileIfNeeded(User user, String firstName, String lastName, String normalizedEmail) {
        boolean changed = false;
        if (firstName != null && !firstName.equals(user.getFirstName())) {
            user.setFirstName(firstName);
            changed = true;
        }
        if (lastName != null && !lastName.equals(user.getLastName())) {
            user.setLastName(lastName);
            changed = true;
        }
        if (!normalizedEmail.equals(user.getEmail())) {
            user.setEmail(normalizedEmail);
            changed = true;
        }
        return changed ? userRepo.save(user) : user;
    }

    private User linkGoogleToExistingUser(User user, String googleSub, String firstName, String lastName) {
        UserRole effective = user.getEffectiveRole();
        if (effective != UserRole.USER) {
            throw new IllegalStateException("This email is registered as staff. Use email and password to sign in.");
        }
        user.setGoogleSubject(googleSub);
        if (user.getRole() == null) {
            user.setRole(UserRole.USER);
        }
        if (firstName != null && !firstName.isBlank()) {
            user.setFirstName(firstName);
        }
        if (lastName != null && !lastName.isBlank()) {
            user.setLastName(lastName);
        }
        return userRepo.save(user);
    }

    private User createGoogleUser(String googleSub, String email, String firstName, String lastName) {
        User user = new User(
            firstName,
            lastName,
            email,
            "",
            null,
            Instant.now()
        );
        user.setGoogleSubject(googleSub);
        user.setRole(UserRole.USER);
        return userRepo.save(user);
    }

    private String extractFirstName(OAuth2User oauth2User) {
        String name = oauth2User.getAttribute("name");
        if (name == null || name.isBlank()) {
            return "User";
        }
        String[] parts = name.trim().split("\\s+", 2);
        return parts[0];
    }

    private String extractLastName(OAuth2User oauth2User) {
        String name = oauth2User.getAttribute("name");
        if (name == null || name.isBlank()) {
            return "";
        }
        String[] parts = name.trim().split("\\s+", 2);
        return parts.length > 1 ? parts[1] : "";
    }

    public Optional<AuthUserResponse> profileForUserId(String userId) {
        return userRepo.findById(userId).map(this::toUserResponse);
    }

    private AuthUserResponse toUserResponse(User user) {
        return new AuthUserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getPhoneNumber(),
            user.getEffectiveRole().name()
        );
    }
}
