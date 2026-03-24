/**
 * @param {import("react-router-dom").NavigateFunction} navigate
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
