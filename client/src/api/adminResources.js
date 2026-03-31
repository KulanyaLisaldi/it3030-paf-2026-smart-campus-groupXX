import { apiDelete, apiGet, apiPatch, apiPost } from "./http";

function toQueryString(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "ALL") params.set("type", filters.type);
  if (typeof filters.minCapacity === "number" && Number.isFinite(filters.minCapacity)) {
    params.set("minCapacity", String(filters.minCapacity));
  }
  if (filters.location && filters.location.trim()) params.set("location", filters.location.trim());
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getAdminResources(filters = {}) {
  return apiGet(`/api/resources${toQueryString(filters)}`);
}

export function createResource(payload) {
  return apiPost("/api/resources", payload);
}

export function updateResourceStatus(resourceId, payload) {
  return apiPatch(`/api/resources/${encodeURIComponent(resourceId)}/status`, payload);
}

export function disableResource(resourceId) {
  return apiDelete(`/api/resources/${encodeURIComponent(resourceId)}`);
}
