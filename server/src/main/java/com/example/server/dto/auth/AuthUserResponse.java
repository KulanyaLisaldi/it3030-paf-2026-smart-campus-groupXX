package com.example.server.dto.auth;

public class AuthUserResponse {

    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;

    public AuthUserResponse() {
    }

    public AuthUserResponse(String id, String firstName, String lastName, String email, String phoneNumber) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
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
}
