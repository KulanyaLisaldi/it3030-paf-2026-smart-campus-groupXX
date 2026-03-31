import { apiDelete, apiGet, apiPatch, apiPost, apiPostFormData } from "./http";

export function signIn(payload) {
  return apiPost("/api/auth/signin", payload);
}

export function fetchCurrentUser() {
  return apiGet("/api/auth/me");
}

export function updateProfilePhone(payload) {
  return apiPatch("/api/auth/profile", payload);
}

export function changeMyPassword(payload) {
  return apiPatch("/api/auth/profile/password", payload);
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
