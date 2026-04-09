package com.example.server.dto.contact;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateContactMessageRequest {

    @NotBlank(message = "First name is required.")
    @Size(max = 80, message = "First name must be at most 80 characters.")
    private String firstName;

    @Size(max = 80, message = "Last name must be at most 80 characters.")
    private String lastName;

    @NotBlank(message = "Email is required.")
    @Email(message = "Enter a valid email address.")
    @Size(max = 180, message = "Email must be at most 180 characters.")
    private String email;

    @Size(max = 24, message = "Phone must be at most 24 characters.")
    private String phone;

    @NotBlank(message = "Subject is required.")
    @Size(min = 3, max = 200, message = "Subject must be 3 to 200 characters.")
    private String subject;

    @NotBlank(message = "Message is required.")
    @Size(min = 10, max = 4000, message = "Message must be 10 to 4000 characters.")
    private String message;

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

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
