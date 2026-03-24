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
