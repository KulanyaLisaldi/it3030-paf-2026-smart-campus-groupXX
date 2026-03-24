package com.example.server.model;

/**
 * USER: campus members (Google sign-in only in normal flows).
 * ADMIN: bootstrapped via env; full administration.
 * TECHNICIAN: created by an admin; email/password sign-in.
 */
public enum UserRole {
    USER,
    ADMIN,
    TECHNICIAN
}
