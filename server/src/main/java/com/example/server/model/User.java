package com.example.server.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    /** Optional campus-only profile photo URL (e.g. /uploads/avatars/...). Not synced with email provider. */
    private String profileImageUrl;
    /** BCrypt hash for local sign-in; null when the account is Google-only until a password is set. */
    private String passwordHash;
    /** Google "sub" claim; links the campus user to the Google account. */
    private String googleSubject;

    /** When null in the database, treated as {@link UserRole#USER} for legacy documents. */
    private UserRole role;

    /** Set for {@link UserRole#TECHNICIAN} when created by admin; null for other roles or legacy users. */
    private TechnicianCategory technicianCategory;
    /** Optional multi-specialty list for technicians; primary specialty remains in technicianCategory. */
    private List<TechnicianCategory> technicianCategories;

    /**
     * For technicians: if null or true, available for assignments; false = unavailable.
     * Ignored for non-technician roles.
     */
    private Boolean technicianAvailable;

    private Instant createdAt;

    /** If true, user can't sign in (email/password, Google OAuth, or JWT). */
    private boolean disabled = false;

    /** Updated on every successful sign-in (email/password or Google OAuth). */
    private Instant lastLoginAt;
    /** Hashed 6-digit OTP for password change verification. */
    private String passwordChangeOtpHash;
    /** New password hash staged until OTP verification succeeds. */
    private String passwordChangePendingHash;
    /** OTP expiry timestamp. */
    private Instant passwordChangeOtpExpiresAt;
    /** Failed OTP attempts for current pending request. */
    private Integer passwordChangeOtpAttempts;

    /**
     * Technicians created by admin: {@code false} until they verify via email link.
     * {@code null} on legacy documents — treated as verified for sign-in.
     */
    private Boolean technicianEmailVerified;

    /** SHA-256 hex of one-time verification token (cleared after success). */
    private String technicianVerificationTokenHash;

    private Instant technicianVerificationExpiresAt;

    /**
     * For {@link UserRole#USER}: in-app notification categories turned off (e.g. BOOKING, TICKET).
     * Null or empty means all categories enabled.
     */
    private List<String> notificationDisabledCategories;

    public User() {
    }

    public User(String firstName, String lastName, String email, String phoneNumber, String passwordHash, Instant createdAt) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public String getPasswordChangeOtpHash() {
        return passwordChangeOtpHash;
    }

    public void setPasswordChangeOtpHash(String passwordChangeOtpHash) {
        this.passwordChangeOtpHash = passwordChangeOtpHash;
    }

    public String getPasswordChangePendingHash() {
        return passwordChangePendingHash;
    }

    public void setPasswordChangePendingHash(String passwordChangePendingHash) {
        this.passwordChangePendingHash = passwordChangePendingHash;
    }

    public Instant getPasswordChangeOtpExpiresAt() {
        return passwordChangeOtpExpiresAt;
    }

    public void setPasswordChangeOtpExpiresAt(Instant passwordChangeOtpExpiresAt) {
        this.passwordChangeOtpExpiresAt = passwordChangeOtpExpiresAt;
    }

    public Integer getPasswordChangeOtpAttempts() {
        return passwordChangeOtpAttempts;
    }

    public void setPasswordChangeOtpAttempts(Integer passwordChangeOtpAttempts) {
        this.passwordChangeOtpAttempts = passwordChangeOtpAttempts;
    }

    public Boolean getTechnicianEmailVerified() {
        return technicianEmailVerified;
    }

    public void setTechnicianEmailVerified(Boolean technicianEmailVerified) {
        this.technicianEmailVerified = technicianEmailVerified;
    }

    public String getTechnicianVerificationTokenHash() {
        return technicianVerificationTokenHash;
    }

    public void setTechnicianVerificationTokenHash(String technicianVerificationTokenHash) {
        this.technicianVerificationTokenHash = technicianVerificationTokenHash;
    }

    public Instant getTechnicianVerificationExpiresAt() {
        return technicianVerificationExpiresAt;
    }

    public void setTechnicianVerificationExpiresAt(Instant technicianVerificationExpiresAt) {
        this.technicianVerificationExpiresAt = technicianVerificationExpiresAt;
    }

    public String getGoogleSubject() {
        return googleSubject;
    }

    public void setGoogleSubject(String googleSubject) {
        this.googleSubject = googleSubject;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public TechnicianCategory getTechnicianCategory() {
        return technicianCategory;
    }

    public void setTechnicianCategory(TechnicianCategory technicianCategory) {
        this.technicianCategory = technicianCategory;
    }

    public List<TechnicianCategory> getTechnicianCategories() {
        return technicianCategories;
    }

    public void setTechnicianCategories(List<TechnicianCategory> technicianCategories) {
        this.technicianCategories = technicianCategories;
    }

    public Boolean getTechnicianAvailable() {
        return technicianAvailable;
    }

    public void setTechnicianAvailable(Boolean technicianAvailable) {
        this.technicianAvailable = technicianAvailable;
    }

    /** Effective role for authorization (never null). */
    public UserRole getEffectiveRole() {
        return role != null ? role : UserRole.USER;
    }

    public List<String> getNotificationDisabledCategories() {
        return notificationDisabledCategories;
    }

    public void setNotificationDisabledCategories(List<String> notificationDisabledCategories) {
        this.notificationDisabledCategories = notificationDisabledCategories;
    }
}
