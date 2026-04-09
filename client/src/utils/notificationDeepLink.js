import { readCampusUser } from "./campusUserStorage";
import { getRoleNotificationsPath } from "./roleNotificationsPath";

/** Notification types whose booking should open under history (past / ended / rejected / cancelled). */
const BOOKING_HISTORY_TYPES = new Set(["BOOKING_REJECTED", "BOOKING_CANCELLED_BY_ADMIN"]);

/**
 * Where to send the user when they open a notification (bell or list).
 * Uses entityType / entityId from the API when present, otherwise targetPath or the role notifications hub.
 */
export function getNotificationActionPath(notification) {
  const role = String(readCampusUser()?.role || "").toUpperCase();
  const entityType = String(notification?.entityType || "").toUpperCase();
  const entityId = String(notification?.entityId || "").trim();
  const type = String(notification?.type || "").toUpperCase();
  const targetPath = String(notification?.targetPath || "").trim();

  if (!entityId) {
    if (targetPath) return targetPath;
    return getRoleNotificationsPath();
  }

  if (role === "ADMIN") {
    if (entityType === "BOOKING" && targetPath.includes("adminbookings")) {
      return `/adminbookings?tab=details&openBooking=${encodeURIComponent(entityId)}`;
    }
    if (entityType === "TICKET" && targetPath.includes("adminticket")) {
      return `/adminticket?view=tickets&openTicket=${encodeURIComponent(entityId)}`;
    }
    if (targetPath) return targetPath;
    return getRoleNotificationsPath();
  }

  if (role === "TECHNICIAN") {
    if (entityType === "TICKET") {
      return `/technician?openTicket=${encodeURIComponent(entityId)}#technician-assigned-tickets`;
    }
    if (targetPath) return targetPath;
    return getRoleNotificationsPath();
  }

  if (entityType === "BOOKING") {
    const useHistory = BOOKING_HISTORY_TYPES.has(type);
    const base = useHistory ? "/account/bookings/history" : "/account/bookings";
    return `${base}?openBooking=${encodeURIComponent(entityId)}`;
  }
  if (entityType === "TICKET") {
    return `/tickets/${encodeURIComponent(entityId)}`;
  }

  if (targetPath) return targetPath;
  return getRoleNotificationsPath();
}
