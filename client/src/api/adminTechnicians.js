import { apiPost } from "./http";

export function createTechnician(payload) {
  return apiPost("/api/admin/technicians", payload);
}
