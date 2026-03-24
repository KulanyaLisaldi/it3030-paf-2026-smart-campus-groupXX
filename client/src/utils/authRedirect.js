/** @typedef {import("react-router-dom").NavigateFunction} NavigateFunction */

const POST_LOGIN_PATH_KEY = "smartCampus_postLoginPath";

/** Remember where to go after Google OAuth (router state is lost across the redirect). */
export function rememberPostLoginPath(path) {
  if (typeof path === "string" && path.startsWith("/")) {
    sessionStorage.setItem(POST_LOGIN_PATH_KEY, path);
  }
}

function takePostLoginPath() {
  const p = sessionStorage.getItem(POST_LOGIN_PATH_KEY);
  if (p) sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
  return p && p.startsWith("/") ? p : null;
}

export const CREATE_TICKET_PATH = "/tickets/create";

/**
 * @param {NavigateFunction} navigate
 */
export function navigateAfterAuth(user, navigate) {
  const role = user?.role;
  if (role === "ADMIN") {
    navigate("/adminticket", { replace: true });
    return;
  }
  if (role === "TECHNICIAN") {
    navigate("/technician", { replace: true });
    return;
  }
  navigate("/", { replace: true });
}

/**
 * After successful login: `location.state.from`, then remembered path, then role-based default.
 * @param {NavigateFunction} navigate
 * @param {unknown} locationState — `useLocation().state`
 */
export function navigateAfterLogin(user, navigate, locationState) {
  const fromState = locationState && typeof locationState === "object" ? locationState.from : undefined;
  const fromStateOk = typeof fromState === "string" && fromState.startsWith("/") ? fromState : null;
  if (fromStateOk) {
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    navigate(fromStateOk, { replace: true });
    return;
  }
  const remembered = takePostLoginPath();
  if (remembered) {
    navigate(remembered, { replace: true });
    return;
  }
  navigateAfterAuth(user, navigate);
}
