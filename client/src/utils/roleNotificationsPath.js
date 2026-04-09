import { readCampusUser } from "./campusUserStorage";

/**
 * In-app path to the signed-in user's role-specific notifications area.
 * Technicians use the main technician shell with hash (see TechnicianDashboard sidebar).
 */
export function getRoleNotificationsPath() {
  const role = String(readCampusUser()?.role || "").toUpperCase();
  if (role === "ADMIN") return "/adminnotifications";
  if (role === "TECHNICIAN") return "/technician#technician-notifications";
  return "/account/notifications";
}
