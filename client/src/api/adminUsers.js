import { apiGet } from "./http";

export function getAdminUsers() {
  return apiGet("/api/admin/users");
}

