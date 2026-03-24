import { apiGet, apiPost } from "./http";

export function signIn(payload) {
  return apiPost("/api/auth/signin", payload);
}

export function fetchCurrentUser() {
  return apiGet("/api/auth/me");
}
