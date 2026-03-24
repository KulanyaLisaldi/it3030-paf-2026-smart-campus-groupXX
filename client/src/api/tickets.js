import { apiDelete, apiGet, apiPost, apiPostFormData, apiPut } from "./http";

export function createTicket(formData) {
  return apiPostFormData("/api/tickets", formData);
}

/** Lists tickets for the authenticated user (JWT). */
export function getMyTickets() {
  return apiGet("/api/tickets/my");
}

export function getTicketDetails(ticketId) {
  const id = encodeURIComponent(ticketId);
  return apiGet(`/api/tickets/${id}`);
}

export function addTicketComment(ticketId, payload) {
  const id = encodeURIComponent(ticketId);
  return apiPost(`/api/tickets/${id}/comments`, payload);
}

export function updateTicket(ticketId, payload) {
  const id = encodeURIComponent(ticketId);
  return apiPut(`/api/tickets/${id}`, payload);
}

export function deleteTicket(ticketId) {
  const id = encodeURIComponent(ticketId);
  return apiDelete(`/api/tickets/${id}`);
}

export function updateTicketComment(ticketId, commentId, payload) {
  const id = encodeURIComponent(ticketId);
  const cId = encodeURIComponent(commentId);
  return apiPut(`/api/tickets/${id}/comments/${cId}`, payload);
}

export function deleteTicketComment(ticketId, commentId) {
  const id = encodeURIComponent(ticketId);
  const cId = encodeURIComponent(commentId);
  return apiDelete(`/api/tickets/${id}/comments/${cId}`);
}
