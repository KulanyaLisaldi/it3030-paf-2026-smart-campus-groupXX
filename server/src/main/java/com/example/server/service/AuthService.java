package com.example.server.service;

import com.example.server.dto.admin.CreateTechnicianRequest;
import com.example.server.dto.admin.CreateStaffUserRequest;
import com.example.server.dto.auth.AuthResponse;
import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.dto.auth.ChangePasswordRequest;
import com.example.server.dto.auth.SignInRequest;
import com.example.server.dto.auth.UpdateProfileRequest;
import com.example.server.dto.auth.VerifyPasswordChangeRequest;
import com.example.server.model.Ticket;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.TicketChatRepo;
import com.example.server.repository.TicketCommentRepo;
import com.example.server.repository.TicketRepo;
import com.example.server.repository.UserRepo;
import com.example.server.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class AuthService {
    private static final String PASSWORD_COMPLEXITY_REGEX =
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,128}$";
    private static final long PASSWORD_OTP_TTL_SECONDS = 10 * 60;
    private static final int PASSWORD_OTP_MAX_ATTEMPTS = 5;

    private final UserRepo userRepo;
    private final TicketRepo ticketRepo;
    private final TicketCommentRepo ticketCommentRepo;
    private final TicketChatRepo ticketChatRepo;
    private final PasswordEncoder passwordEncoder;
    private final PasswordOtpEmailService passwordOtpEmailService;
    private final JwtService jwtService;

    public AuthService(
        UserRepo userRepo,
        TicketRepo ticketRepo,
        TicketCommentRepo ticketCommentRepo,
        TicketChatRepo ticketChatRepo,
        PasswordEncoder passwordEncoder,
        PasswordOtpEmailService passwordOtpEmailService,
        JwtService jwtService
    ) {
        this.userRepo = userRepo;
        this.ticketRepo = ticketRepo;
        this.ticketCommentRepo = ticketCommentRepo;
        this.ticketChatRepo = ticketChatRepo;
        this.passwordEncoder = passwordEncoder;
        this.passwordOtpEmailService = passwordOtpEmailService;
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
        if (user.isDisabled()) {
            return Optional.empty();
        }
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

        // Record successful sign-in
        user.setLastLoginAt(Instant.now());
        userRepo.save(user);

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
        List<com.example.server.model.TechnicianCategory> specialties = normalizedTechnicianCategories(request);
        user.setTechnicianCategory(specialties.isEmpty() ? request.getCategory() : specialties.get(0));
        user.setTechnicianCategories(specialties);
        User saved = userRepo.save(user);
        return toUserResponse(saved);
    }

    public AuthUserResponse createStaffUser(CreateStaffUserRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepo.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }
        UserRole targetRole = request.getRole();
        if (targetRole != UserRole.ADMIN && targetRole != UserRole.TECHNICIAN) {
            throw new IllegalArgumentException("Role must be ADMIN or TECHNICIAN");
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
        user.setRole(targetRole);
        if (targetRole == UserRole.TECHNICIAN) {
            List<com.example.server.model.TechnicianCategory> specialties =
                normalizedTechnicianCategories(request.getCategories(), request.getCategory());
            if (specialties.isEmpty()) {
                throw new IllegalArgumentException("Select at least one technician category.");
            }
            user.setTechnicianCategory(specialties.get(0));
            user.setTechnicianCategories(specialties);
        } else {
            user.setTechnicianCategory(null);
            user.setTechnicianCategories(null);
            user.setTechnicianAvailable(null);
        }
        User saved = userRepo.save(user);
        return toUserResponse(saved);
    }

    private List<com.example.server.model.TechnicianCategory> normalizedTechnicianCategories(CreateTechnicianRequest request) {
        return normalizedTechnicianCategories(request.getCategories(), request.getCategory());
    }

    private List<com.example.server.model.TechnicianCategory> normalizedTechnicianCategories(
        List<com.example.server.model.TechnicianCategory> categories,
        com.example.server.model.TechnicianCategory category
    ) {
        LinkedHashSet<com.example.server.model.TechnicianCategory> out = new LinkedHashSet<>();
        if (categories != null) {
            out.addAll(categories.stream().filter(Objects::nonNull).toList());
        }
        if (category != null) {
            out.add(category);
        }
        return new ArrayList<>(out);
    }

    public List<AuthUserResponse> listTechnicians() {
        return userRepo.findByRole(UserRole.TECHNICIAN).stream()
            .sorted(Comparator
                .comparing(User::getLastName, Comparator.nullsFirst(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(User::getFirstName, Comparator.nullsFirst(String.CASE_INSENSITIVE_ORDER)))
            .map(this::toUserResponse)
            .toList();
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

        User synced = userRepo.findByGoogleSubject(sub)
            .map(existing -> ensureUserRole(updateProfileIfNeeded(existing, firstName, lastName, normalizedEmail)))
            .orElseGet(() -> userRepo.findByEmail(normalizedEmail)
                .map(existing -> linkGoogleToExistingUser(existing, sub, firstName, lastName))
                .orElseGet(() -> createGoogleUser(sub, normalizedEmail, firstName, lastName)));

        if (synced.isDisabled()) {
            throw new IllegalStateException("Account disabled");
        }

        // Record successful sign-in for analytics/admin display
        synced.setLastLoginAt(Instant.now());
        return userRepo.save(synced);
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

    public Optional<AuthUserResponse> updatePhone(String userId, UpdateProfileRequest request) {
        return userRepo.findById(userId).map(user -> {
            user.setPhoneNumber(request.getPhoneNumber().trim());
            return toUserResponse(userRepo.save(user));
        });
    }

    public boolean changePassword(String userId, ChangePasswordRequest request) {
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return false;
        }
        User user = maybe.get();
        UserRole role = user.getEffectiveRole();
        if (role != UserRole.ADMIN && role != UserRole.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin and technician accounts can change password here");
        }
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This account uses Google sign-in. Password change is not available.");
        }
        String current = request.getCurrentPassword() == null ? "" : request.getCurrentPassword().trim();
        String next = request.getNewPassword() == null ? "" : request.getNewPassword().trim();
        String hash = user.getPasswordHash();
        if (hash == null || hash.isBlank() || !passwordEncoder.matches(current, hash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (current.equals(next)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }
        if (!next.matches(PASSWORD_COMPLEXITY_REGEX)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must include uppercase, lowercase, number, and symbol"
            );
        }
        user.setPasswordHash(passwordEncoder.encode(next));
        userRepo.save(user);
        return true;
    }

    public boolean requestPasswordChangeOtp(String userId, ChangePasswordRequest request) {
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return false;
        }
        User user = maybe.get();
        validatePasswordChangeRequest(user, request);

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        user.setPasswordChangeOtpHash(sha256Hex(code));
        user.setPasswordChangePendingHash(passwordEncoder.encode(request.getNewPassword().trim()));
        user.setPasswordChangeOtpExpiresAt(Instant.now().plusSeconds(PASSWORD_OTP_TTL_SECONDS));
        user.setPasswordChangeOtpAttempts(0);
        userRepo.save(user);

        try {
            passwordOtpEmailService.sendPasswordChangeOtp(user.getEmail(), code);
        } catch (Exception e) {
            clearPendingPasswordChange(user);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not send verification email");
        }
        return true;
    }

    public boolean verifyPasswordChangeOtp(String userId, VerifyPasswordChangeRequest request) {
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return false;
        }
        User user = maybe.get();
        UserRole role = user.getEffectiveRole();
        if (role != UserRole.ADMIN && role != UserRole.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin and technician accounts can change password here");
        }
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This account uses Google sign-in. Password change is not available.");
        }
        if (user.getPasswordChangeOtpHash() == null || user.getPasswordChangePendingHash() == null || user.getPasswordChangeOtpExpiresAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending password change request. Request a new code.");
        }
        if (Instant.now().isAfter(user.getPasswordChangeOtpExpiresAt())) {
            clearPendingPasswordChange(user);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code expired. Request a new code.");
        }
        int attempts = user.getPasswordChangeOtpAttempts() == null ? 0 : user.getPasswordChangeOtpAttempts();
        if (attempts >= PASSWORD_OTP_MAX_ATTEMPTS) {
            clearPendingPasswordChange(user);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many invalid attempts. Request a new code.");
        }

        String submittedHash = sha256Hex(request.getCode().trim());
        if (!submittedHash.equals(user.getPasswordChangeOtpHash())) {
            user.setPasswordChangeOtpAttempts(attempts + 1);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code");
        }

        user.setPasswordHash(user.getPasswordChangePendingHash());
        clearPendingPasswordChange(user);
        userRepo.save(user);
        return true;
    }

    /**
     * Sends a 6-digit OTP to the email for admin/technician accounts that use email/password (not Google).
     * Uses {@link User#getPasswordChangePendingHash()} == null to distinguish forgot-password OTP from
     * logged-in password-change OTP (which stages the new hash in pending).
     */
    public void requestForgotPassword(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        Optional<User> maybe = userRepo.findByEmail(email);
        if (maybe.isEmpty()) {
            return;
        }
        User user = maybe.get();
        if (user.isDisabled()) {
            return;
        }
        UserRole role = user.getEffectiveRole();
        if (role != UserRole.ADMIN && role != UserRole.TECHNICIAN) {
            return;
        }
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().isBlank()) {
            return;
        }

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        user.setPasswordChangeOtpHash(sha256Hex(code));
        user.setPasswordChangePendingHash(null);
        user.setPasswordChangeOtpExpiresAt(Instant.now().plusSeconds(PASSWORD_OTP_TTL_SECONDS));
        user.setPasswordChangeOtpAttempts(0);
        userRepo.save(user);

        try {
            passwordOtpEmailService.sendForgotPasswordOtp(user.getEmail(), code);
        } catch (Exception e) {
            clearPendingPasswordChange(user);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not send reset email");
        }
    }

    public void completeForgotPassword(String rawEmail, String rawCode, String rawNewPassword) {
        String email = normalizeEmail(rawEmail);
        Optional<User> maybe = userRepo.findByEmail(email);
        if (maybe.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification code");
        }
        User user = maybe.get();
        UserRole role = user.getEffectiveRole();
        if (role != UserRole.ADMIN && role != UserRole.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired verification code");
        }
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This account uses Google sign-in");
        }
        if (user.getPasswordChangePendingHash() != null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A different password change is in progress. Use the code from your latest email or try again later."
            );
        }
        if (user.getPasswordChangeOtpHash() == null || user.getPasswordChangeOtpExpiresAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No reset request found. Request a new code.");
        }
        if (Instant.now().isAfter(user.getPasswordChangeOtpExpiresAt())) {
            clearPendingPasswordChange(user);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code expired. Request a new code.");
        }
        int attempts = user.getPasswordChangeOtpAttempts() == null ? 0 : user.getPasswordChangeOtpAttempts();
        if (attempts >= PASSWORD_OTP_MAX_ATTEMPTS) {
            clearPendingPasswordChange(user);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many invalid attempts. Request a new code.");
        }

        String code = rawCode == null ? "" : rawCode.trim();
        if (!code.matches("^\\d{6}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code must be 6 digits");
        }
        String next = rawNewPassword == null ? "" : rawNewPassword.trim();
        if (!next.matches(PASSWORD_COMPLEXITY_REGEX)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must include uppercase, lowercase, number, and symbol"
            );
        }

        String submittedHash = sha256Hex(code);
        if (!submittedHash.equals(user.getPasswordChangeOtpHash())) {
            user.setPasswordChangeOtpAttempts(attempts + 1);
            userRepo.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code");
        }

        String existingHash = user.getPasswordHash();
        if (existingHash != null && !existingHash.isBlank() && passwordEncoder.matches(next, existingHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from your current password");
        }

        user.setPasswordHash(passwordEncoder.encode(next));
        clearPendingPasswordChange(user);
        userRepo.save(user);
    }

    public void resetTechnicianPasswordByAdmin(String targetUserId, String newPassword) {
        Optional<User> maybe = userRepo.findById(targetUserId);
        if (maybe.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        User target = maybe.get();
        if (target.getEffectiveRole() != UserRole.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password reset is allowed for technicians only");
        }
        if (target.getGoogleSubject() != null && !target.getGoogleSubject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google accounts cannot be reset with a local password");
        }
        String next = newPassword == null ? "" : newPassword.trim();
        if (!next.matches(PASSWORD_COMPLEXITY_REGEX)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must include uppercase, lowercase, number, and symbol"
            );
        }
        target.setPasswordHash(passwordEncoder.encode(next));
        clearPendingPasswordChange(target);
        userRepo.save(target);
    }

    private void validatePasswordChangeRequest(User user, ChangePasswordRequest request) {
        UserRole role = user.getEffectiveRole();
        if (role != UserRole.ADMIN && role != UserRole.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin and technician accounts can change password here");
        }
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This account uses Google sign-in. Password change is not available.");
        }
        String current = request.getCurrentPassword() == null ? "" : request.getCurrentPassword().trim();
        String next = request.getNewPassword() == null ? "" : request.getNewPassword().trim();
        String hash = user.getPasswordHash();
        if (hash == null || hash.isBlank() || !passwordEncoder.matches(current, hash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (current.equals(next)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }
        if (!next.matches(PASSWORD_COMPLEXITY_REGEX)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Password must include uppercase, lowercase, number, and symbol"
            );
        }
    }

    private void clearPendingPasswordChange(User user) {
        user.setPasswordChangeOtpHash(null);
        user.setPasswordChangePendingHash(null);
        user.setPasswordChangeOtpExpiresAt(null);
        user.setPasswordChangeOtpAttempts(null);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    public Optional<AuthUserResponse> updateTechnicianAvailability(String userId, boolean available) {
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        User user = maybe.get();
        if (user.getEffectiveRole() != UserRole.TECHNICIAN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only technicians can update availability");
        }
        user.setTechnicianAvailable(available);
        return Optional.of(toUserResponse(userRepo.save(user)));
    }

    public Optional<AuthUserResponse> updateProfileAvatar(String userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        User user = maybe.get();

        Path dir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
        Files.createDirectories(dir);
        String original = file.getOriginalFilename() == null ? "avatar" : file.getOriginalFilename();
        String safe = UUID.randomUUID() + "-" + original.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path dest = dir.resolve(safe);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        String publicPath = "/uploads/avatars/" + safe;
        user.setProfileImageUrl(publicPath);
        return Optional.of(toUserResponse(userRepo.save(user)));
    }

    public Optional<AuthUserResponse> removeProfileAvatar(String userId) {
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        User user = maybe.get();
        deleteAvatarFileIfSafe(user.getProfileImageUrl());
        user.setProfileImageUrl(null);
        return Optional.of(toUserResponse(userRepo.save(user)));
    }

    private void deleteAvatarFileIfSafe(String publicPath) {
        if (publicPath == null || publicPath.isBlank()) {
            return;
        }
        String prefix = "/uploads/avatars/";
        if (!publicPath.startsWith(prefix)) {
            return;
        }
        String name = publicPath.substring(prefix.length());
        if (name.isBlank() || name.contains("..") || name.indexOf('/') >= 0 || name.indexOf('\\') >= 0) {
            return;
        }
        Path base = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
        Path file = base.resolve(name).normalize();
        if (!file.startsWith(base)) {
            return;
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // file may be missing or locked; DB still clears the URL
        }
    }

    public boolean deleteAccount(String userId) {
        Optional<User> maybe = userRepo.findById(userId);
        if (maybe.isEmpty()) {
            return false;
        }
        User user = maybe.get();
        if (user.getEffectiveRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Administrator accounts cannot be deleted from your profile. Ask another administrator to adjust access if needed."
            );
        }
        List<Ticket> tickets = ticketRepo.findByCreatedByOrderByCreatedAtDesc(userId);
        for (Ticket t : tickets) {
            ticketCommentRepo.deleteByTicketId(t.getId());
            ticketChatRepo.deleteByTicketId(t.getId());
            ticketRepo.deleteById(t.getId());
        }
        userRepo.deleteById(userId);
        return true;
    }

    private AuthUserResponse toUserResponse(User user) {
        String category = user.getTechnicianCategory() != null ? user.getTechnicianCategory().name() : null;
        List<String> categories = null;
        if (user.getTechnicianCategories() != null && !user.getTechnicianCategories().isEmpty()) {
            categories = user.getTechnicianCategories().stream()
                .filter(Objects::nonNull)
                .map(Enum::name)
                .toList();
        } else if (category != null) {
            categories = List.of(category);
        }
        Boolean technicianAvailable = null;
        if (user.getEffectiveRole() == UserRole.TECHNICIAN) {
            technicianAvailable = user.getTechnicianAvailable() == null || user.getTechnicianAvailable();
        }
        String provider = (user.getGoogleSubject() != null && !user.getGoogleSubject().isBlank()) ? "Google OAuth" : "Email";
        return new AuthUserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getPhoneNumber(),
            user.getEffectiveRole().name(),
            provider,
            user.getProfileImageUrl(),
            category,
            categories,
            technicianAvailable
        );
    }
}
