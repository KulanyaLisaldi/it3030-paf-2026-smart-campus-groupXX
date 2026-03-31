package com.example.server.dto.auth;

import java.util.List;

public class AuthUserResponse {

    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String role;
    private String profileImageUrl;
    /** {@link com.example.server.model.TechnicianCategory} name for technicians; null otherwise. */
    private String technicianCategory;
    /** Optional multi-specialty list for technicians. */
    private List<String> technicianCategories;
    /** For technicians: true = available, false = unavailable; null for other roles or unspecified. */
    private Boolean technicianAvailable;

    public AuthUserResponse() {
    }

    public AuthUserResponse(
        String id,
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        String role,
        String profileImageUrl,
        String technicianCategory,
        List<String> technicianCategories,
        Boolean technicianAvailable
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.profileImageUrl = profileImageUrl;
        this.technicianCategory = technicianCategory;
        this.technicianCategories = technicianCategories;
        this.technicianAvailable = technicianAvailable;
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
}
