/**
 * Display title for UI. Maps notification `type` so legacy DB rows still show current copy
 * (e.g. older documents may still store an outdated `title` string).
 */
export function getNotificationDisplayTitle(notification) {
  const type = String(notification?.type || "").toUpperCase();
  if (type === "USER_FIRST_LOGIN") return "New user sign in";
  if (type === "BOOKING_CANCELLED_BY_USER") return "Booking cancelled by user";
  if (type === "BOOKING_UPDATED_BY_USER") return "Pending booking updated";
  const raw = String(notification?.title || "").trim();
  return raw || "Notification";
}
