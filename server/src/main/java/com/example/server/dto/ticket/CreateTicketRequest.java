package com.example.server.dto.ticket;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateTicketRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(
        regexp = "^[0-9+\\-()\\s]{7,20}$",
        message = "Please provide a valid phone number"
    )
    private String phoneNumber;

    @NotBlank(message = "Resource/Location is required")
    private String resourceLocation;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Issue title is required")
    private String issueTitle;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Priority is required")
    private String priority;

    /** Ignored when set; server fills from JWT subject. Optional for older clients. */
    private String createdBy;

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
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

    public String getResourceLocation() {
        return resourceLocation;
    }

    public void setResourceLocation(String resourceLocation) {
        this.resourceLocation = resourceLocation;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getIssueTitle() {
        return issueTitle;
    }

    public void setIssueTitle(String issueTitle) {
        this.issueTitle = issueTitle;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
