package com.example.server.dto.admin;

import com.example.server.model.TechnicianCategory;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CreateTechnicianRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;

    /** Optional; stored for contact. */
    @Pattern(regexp = "^$|^[0-9+\\-\\s()]{7,20}$", message = "Phone number format is invalid")
    private String phoneNumber = "";

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 128, message = "Password must be at least 6 characters")
    private String password;

    @NotNull(message = "Category is required")
    private TechnicianCategory category;
    /** Optional multi-specialty list for technicians. */
    private List<TechnicianCategory> categories;

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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public TechnicianCategory getCategory() {
        return category;
    }

    public void setCategory(TechnicianCategory category) {
        this.category = category;
    }

    public List<TechnicianCategory> getCategories() {
        return categories;
    }

    public void setCategories(List<TechnicianCategory> categories) {
        this.categories = categories;
    }
}
