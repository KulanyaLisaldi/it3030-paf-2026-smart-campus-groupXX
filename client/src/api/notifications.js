import { apiGet, apiPatch } from "./http";

export function getNotifications(limit = 50) {
  return apiGet(`/api/notifications?limit=${encodeURIComponent(String(limit))}`);
}

/** Paginated list (newest first). Returns { content, totalElements, totalPages, page, size }. */
export function getNotificationsPage(page = 0, size = 15) {
  return apiGet(
    `/api/notifications/page?page=${encodeURIComponent(String(page))}&size=${encodeURIComponent(String(size))}`
  );
}

export function getUnreadNotificationCount() {
  return apiGet("/api/notifications/unread-count");
}

export function markNotificationRead(notificationId) {
  return apiPatch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {});
}

export function markAllNotificationsRead() {
  return apiPatch("/api/notifications/read-all", {});
}
