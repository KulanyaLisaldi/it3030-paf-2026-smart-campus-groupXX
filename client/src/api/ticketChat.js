import { apiGet, apiPost } from "./http";

/** @returns {Promise<{ messages: Array }>} */
export function getTicketChatMessages(ticketId) {
  const id = encodeURIComponent(ticketId);
  return apiGet(`/api/tickets/${id}/chat`);
}

/** @returns {Promise<{ message: object }>} */
export function postTicketChatMessage(ticketId, bodyText) {
  const id = encodeURIComponent(ticketId);
  return apiPost(`/api/tickets/${id}/chat`, { body: bodyText });
}
