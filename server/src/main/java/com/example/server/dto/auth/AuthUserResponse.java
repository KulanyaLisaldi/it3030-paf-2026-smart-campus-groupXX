package com.example.server.dto.auth;

import java.util.List;

public class AuthUserResponse {

    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String role;
    private String provider;
    private String profileImageUrl;
    /** {@link com.example.server.model.TechnicianCategory} name for technicians; null otherwise. */
    private String technicianCategory;
    /** Optional multi-specialty list for technicians. */
    private List<String> technicianCategories;
    /** For technicians: true = available, false = unavailable; null for other roles or unspecified. */
    private Boolean technicianAvailable;

    /** For technicians: true after email verification; null = legacy (treated as verified). */
    private Boolean technicianEmailVerified;

    /**
     * For {@code USER} role: in-app notification categories turned off (BOOKING, TICKET). Null for staff roles.
     */
    private List<String> notificationDisabledCategories;

    public AuthUserResponse() {
    }

    public AuthUserResponse(
        String id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        String role,
        String provider,
        String profileImageUrl,
        String technicianCategory,
        List<String> technicianCategories,
        Boolean technicianAvailable,
        Boolean technicianEmailVerified
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.provider = provider;
        this.profileImageUrl = profileImageUrl;
        this.technicianCategory = technicianCategory;
        this.technicianCategories = technicianCategories;
        this.technicianAvailable = technicianAvailable;
        this.technicianEmailVerified = technicianEmailVerified;
    }

    public String getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getRole() {
        return role;
    }

    public String getProvider() {
        return provider;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public String getTechnicianCategory() {
        return technicianCategory;
    }

    public void setTechnicianCategory(String technicianCategory) {
        this.technicianCategory = technicianCategory;
    }

    public List<String> getTechnicianCategories() {
        return technicianCategories;
    }

    public void setTechnicianCategories(List<String> technicianCategories) {
        this.technicianCategories = technicianCategories;
    }

    public Boolean getTechnicianAvailable() {
        return technicianAvailable;
    }

    public void setTechnicianAvailable(Boolean technicianAvailable) {
        this.technicianAvailable = technicianAvailable;
    }

    public Boolean getTechnicianEmailVerified() {
        return technicianEmailVerified;
    }

    public void setTechnicianEmailVerified(Boolean technicianEmailVerified) {
        this.technicianEmailVerified = technicianEmailVerified;
    }

    public List<String> getNotificationDisabledCategories() {
        return notificationDisabledCategories;
    }

    public void setNotificationDisabledCategories(List<String> notificationDisabledCategories) {
        this.notificationDisabledCategories = notificationDisabledCategories;
    }
}
