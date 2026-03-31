import { apiGet } from "./http";

function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "ALL") params.set("type", filters.type);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (typeof filters.minCapacity === "number" && Number.isFinite(filters.minCapacity)) {
    params.set("minCapacity", String(filters.minCapacity));
  }
  if (filters.location && filters.location.trim()) params.set("location", filters.location.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getResources(filters = {}) {
  return apiGet(`/api/resources${toQueryString(filters)}`);
}

export function getResourceById(resourceId) {
  return apiGet(`/api/resources/${encodeURIComponent(resourceId)}`);
}
