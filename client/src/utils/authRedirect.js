/** @typedef {import("react-router-dom").NavigateFunction} NavigateFunction */

const POST_LOGIN_PATH_KEY = "smartCampus_postLoginPath";

/** Remember where to go after Google OAuth (router state is lost across the redirect). */
export function rememberPostLoginPath(path) {
  if (typeof path === "string" && path.startsWith("/")) {
    sessionStorage.setItem(POST_LOGIN_PATH_KEY, path);
  }
}

export const CREATE_TICKET_PATH = "/tickets/create";

export const ACCOUNT_PATH = "/account";

/** Admin home: technician management (not the ticket console). */
export const ADMIN_DASHBOARD_PATH = "/admin";

/**
 * @param {NavigateFunction} navigate
 */
export function navigateAfterAuth(user, navigate) {
  const role = user?.role;
  if (role === "ADMIN") {
    navigate(ADMIN_DASHBOARD_PATH, { replace: true });
    return;
  }
  if (role === "TECHNICIAN") {
    navigate("/technician/tickets", { replace: true });
    return;
  }
  navigate("/", { replace: true });
}

/**
 * After successful login: campus users may return to a stored path (e.g. Create Ticket).
 * Admin and technician always go to their home surfaces (admin console, technician ticket dashboard) — never to Create Ticket from that flow.
 * @param {NavigateFunction} navigate
 * @param {unknown} locationState — `useLocation().state`
 */
export function navigateAfterLogin(user, navigate, locationState) {
  const role = user?.role;

  if (role === "ADMIN" || role === "TECHNICIAN") {
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    navigateAfterAuth(user, navigate);
    return;
  }

  const fromState = locationState && typeof locationState === "object" ? locationState.from : undefined;
  const fromStateOk = typeof fromState === "string" && fromState.startsWith("/") ? fromState : null;
  const remembered = sessionStorage.getItem(POST_LOGIN_PATH_KEY);
  if (remembered) {
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
  }
  const rememberedOk = remembered && remembered.startsWith("/") ? remembered : null;

  const target = fromStateOk || rememberedOk;
  if (target) {
    navigate(target, { replace: true });
    return;
  }

  navigateAfterAuth(user, navigate);
}
