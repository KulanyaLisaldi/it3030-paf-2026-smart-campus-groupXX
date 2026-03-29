/** Formats ISO-8601 instant from API (e.g. ticket createdAt) for display. */
export function formatTicketInstant(value) {
  if (value == null || value === "") return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/** Human-readable duration from total seconds (API: timeToFirstResponseSeconds, timeToResolutionSeconds). */
export function formatDurationSeconds(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  let s = Math.max(0, Math.floor(Number(seconds)));
  const days = Math.floor(s / 86400);
  s %= 86400;
  const hours = Math.floor(s / 3600);
  s %= 3600;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins) parts.push(`${mins}m`);
  if (parts.length === 0) {
    return secs > 0 ? `${secs}s` : "0m";
  }
  return parts.join(" ");
}
