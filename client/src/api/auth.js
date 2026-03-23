import { apiPost } from "./http";

export function signUp(payload) {
  return apiPost("/api/auth/signup", payload);
}

export function signIn(payload) {
  return apiPost("/api/auth/signin", payload);
}
