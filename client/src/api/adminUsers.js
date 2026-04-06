import { apiDelete, apiGet, apiPatch, apiPost } from "./http";

export function getAdminUsers() {
  return apiGet("/api/admin/users");
}

export function adminUpdateUserProfile(userId, payload) {
  return apiPatch(`/api/admin/users/${encodeURIComponent(userId)}/profile`, payload);
}

export function adminChangeUserRole(userId, payload) {
  return apiPatch(`/api/admin/users/${encodeURIComponent(userId)}/role`, payload);
}

export function adminSetUserStatus(userId, payload) {
  return apiPatch(`/api/admin/users/${encodeURIComponent(userId)}/status`, payload);
}

export function adminCreateUser(payload) {
  return apiPost("/api/admin/users", payload);
}

export function adminDeleteUser(userId) {
  return apiDelete(`/api/admin/users/${encodeURIComponent(userId)}`);
}

