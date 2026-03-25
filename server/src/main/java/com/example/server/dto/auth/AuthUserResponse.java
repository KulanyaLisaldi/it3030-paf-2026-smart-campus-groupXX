package com.example.server.dto.auth;

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
        String technicianCategory
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.profileImageUrl = profileImageUrl;
        this.technicianCategory = technicianCategory;
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
}
