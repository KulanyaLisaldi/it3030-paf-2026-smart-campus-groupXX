import { apiGet, apiPatch } from "./http";

export function getNotifications(limit = 50) {
  return apiGet(`/api/notifications?limit=${encodeURIComponent(String(limit))}`);
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
