/**
 * Image URLs for resources: convert API values to a URL every teammate's browser can load.
 *
 * - Strips http://localhost / 127.0.0.1 absolute URLs to a path so the browser uses the
 *   current app origin (Vite dev proxy, or shared host).
 * - If VITE_API_ORIGIN is set (e.g. http://192.168.x.x:8081), /uploads/* is loaded from that
 *   backend (useful when the UI is not proxying /uploads).
 */

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || "").trim().replace(/\/$/, "");

function isLoopbackHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

/**
 * @param {string|undefined|null} url
 * @returns {string}
 */
export function resolveResourceImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  // Local previews (admin create/edit) must pass through untouched
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (isLoopbackHostname(u.hostname)) {
        const path = `${u.pathname || ""}${u.search || ""}`;
        if (path.startsWith("/uploads") && API_ORIGIN) {
          return `${API_ORIGIN}${path}`;
        }
        return path || "";
      }
      return raw;
    } catch {
      return "";
    }
  }

  if (raw.startsWith("/")) {
    if (raw.startsWith("/uploads") && API_ORIGIN) {
      return `${API_ORIGIN}${raw}`;
    }
    return raw;
  }

  const path = `/${raw.replace(/^\.?\/*/, "")}`;
  if (path.startsWith("/uploads") && API_ORIGIN) {
    return `${API_ORIGIN}${path}`;
  }
  return path;
}
