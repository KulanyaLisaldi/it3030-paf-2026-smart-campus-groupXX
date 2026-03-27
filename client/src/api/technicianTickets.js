import { apiGet, apiPatch, apiPost } from "./http";

/** Tickets assigned to the signed-in technician (JWT, ROLE_TECHNICIAN). */
export async function getTechnicianAssignedTickets() {
  try {
    return await apiGet("/api/technician/assigned-tickets");
  } catch {
    return apiGet("/api/tickets/technician/assigned");
  }
}

/**
 * Updates ticket status to IN_PROGRESS or RESOLVED. Server enforces assignment and valid transitions.
 * @param {string} ticketId
 * @param {"IN_PROGRESS"|"RESOLVED"} status
 */
export async function updateTechnicianTicketProgress(ticketId, status) {
  const id = encodeURIComponent(ticketId);
  const url = `/api/technician/tickets/${id}/progress`;
  const body = { status };
  try {
    return await apiPatch(url, body);
  } catch {
    return apiPost(url, body);
  }
}
