import { apiDelete, apiGet, apiPatch, apiPost, apiPostFormData } from "./http";

export function signIn(payload) {
  return apiPost("/api/auth/signin", payload);
}

/** Returns { allowed: boolean } — staff email account with verified technician email (when applicable), not Google-only */
export function checkForgotPasswordEligibility(payload) {
  return apiPost("/api/auth/forgot-password/check", payload);
}

/** Admin/technician email accounts — sends OTP to email */
export function requestForgotPassword(payload) {
  return apiPost("/api/auth/forgot-password", payload);
}

/** Complete reset with email, 6-digit code, and new password */
export function completeForgotPassword(payload) {
  return apiPost("/api/auth/forgot-password/complete", payload);
}

export function fetchCurrentUser() {
  return apiGet("/api/auth/me");
}

export function updateProfilePhone(payload) {
  return apiPatch("/api/auth/profile", payload);
}

/** @param {{ disabledCategories: string[] }} payload — USER only; category ids: BOOKING, TICKET */
export function updateNotificationPreferences(payload) {
  return apiPatch("/api/auth/profile/notification-preferences", payload);
}

export function changeMyPassword(payload) {
  return apiPatch("/api/auth/profile/password", payload);
}

export function verifyMyPasswordChange(payload) {
  return apiPatch("/api/auth/profile/password/verify", payload);
}

/** @param {boolean} available - true = available, false = unavailable (technicians only) */
export function updateTechnicianAvailability(available) {
  return apiPatch("/api/auth/profile/technician-availability", { available });
}

/** @param {FormData} formData — must include field name `file` */
export function uploadProfileAvatar(formData) {
  return apiPostFormData("/api/auth/profile/avatar", formData);
}

export function removeProfileAvatar() {
  return apiDelete("/api/auth/profile/avatar");
}

export function deleteAccount() {
  return apiDelete("/api/auth/profile");
}
