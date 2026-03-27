import { apiGet, apiPatch, apiPost } from "./http";

export async function getAdminTicketList() {
  try {
    return await apiGet("/api/adminticket/tickets");
  } catch {
    // Fallback for older backend route name still running.
    return apiGet("/api/admin/tickets");
  }
}

/** Persists ACCEPTED + assigned technician on the server; returns { ticket, comments }. */
export async function acceptAdminTicket(ticketId, body) {
  const id = encodeURIComponent(ticketId);
  const urls = [`/api/adminticket/tickets/${id}/accept`, `/api/admin/tickets/${id}/accept`];
  let lastErr;
  for (const url of urls) {
    for (const call of [() => apiPatch(url, body), () => apiPost(url, body)]) {
      try {
        return await call();
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr;
}

