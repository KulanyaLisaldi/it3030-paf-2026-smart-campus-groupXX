import { apiGet } from "./http";

export async function getAdminTicketList() {
  try {
    return await apiGet("/api/adminticket/tickets");
  } catch {
    // Fallback for older backend route name still running.
    return apiGet("/api/admin/tickets");
  }
}

