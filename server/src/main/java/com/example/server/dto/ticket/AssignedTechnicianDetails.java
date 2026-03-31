package com.example.server.dto.ticket;

import java.util.ArrayList;
import java.util.List;

/**
 * Resolved from {@link com.example.server.model.User} when a ticket has an assignee.
 */
public class AssignedTechnicianDetails {

    private String userId;
    private String displayName;
    private String email;
    private String phoneNumber;
    /** {@link com.example.server.model.TechnicianCategory} enum name, e.g. IT_SUPPORT */
    private String technicianCategory;
    /** All specialties for multi-category technicians; may be empty for legacy users. */
    private List<String> technicianCategories = new ArrayList<>();

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
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
        this.technicianCategories = technicianCategories != null ? technicianCategories : new ArrayList<>();
    }
}
