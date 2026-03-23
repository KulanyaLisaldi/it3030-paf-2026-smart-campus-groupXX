import { apiGet, apiPostFormData } from "./http";

export function createTicket(formData) {
  return apiPostFormData("/api/tickets", formData);
}

export function getMyTickets(createdBy) {
  const query = encodeURIComponent(createdBy);
  return apiGet(`/api/tickets/my?createdBy=${query}`);
}
