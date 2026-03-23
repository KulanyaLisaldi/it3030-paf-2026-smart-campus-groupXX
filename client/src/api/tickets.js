import { apiGet, apiPostFormData } from "./http";

export function createTicket(formData) {
  return apiPostFormData("/api/tickets", formData);
}

export function getMyTickets(createdBy) {
  const query = encodeURIComponent(createdBy);
  return apiGet(`/api/tickets/my?createdBy=${query}`);
}

export function getTicketDetails(ticketId) {
  const id = encodeURIComponent(ticketId);
  return apiGet(`/api/tickets/${id}`);
}

export function addTicketComment(ticketId, payload) {
  const id = encodeURIComponent(ticketId);
  return apiPost(`/api/tickets/${id}/comments`, payload);
}
