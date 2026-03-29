import { apiGet, apiPost } from "./http";

export function listTechnicians() {
  return apiGet("/api/admin/technicians");
}

export function createTechnician(payload) {
  return apiPost("/api/admin/technicians", payload);
}
