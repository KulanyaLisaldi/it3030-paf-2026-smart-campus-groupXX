/**
 * Display title for UI. Maps notification `type` so legacy DB rows still show current copy
 * (e.g. older documents may still store an outdated `title` string).
 */
export function getNotificationDisplayTitle(notification) {
  const type = String(notification?.type || "").toUpperCase();
  if (type === "USER_FIRST_LOGIN") return "New user sign in";
  const raw = String(notification?.title || "").trim();
  return raw || "Notification";
}
