import { apiDelete, apiGet, apiPatch, apiPost } from "./http";

export function checkBookingAvailability({ resourceId, bookingDate, startTime, endTime }) {
  const params = new URLSearchParams({
    resourceId: String(resourceId || ""),
    bookingDate: String(bookingDate || ""),
    startTime: String(startTime || ""),
    endTime: String(endTime || ""),
  });
  return apiGet(`/api/bookings/availability?${params.toString()}`);
}

export function createBooking(payload) {
  return apiPost("/api/bookings", payload);
}

export function getBookedSlots({ resourceId, bookingDate, excludeBookingId }) {
  const params = new URLSearchParams({
    resourceId: String(resourceId || ""),
    bookingDate: String(bookingDate || ""),
  });
  if (excludeBookingId) params.set("excludeBookingId", String(excludeBookingId));
  return apiGet(`/api/bookings/slots?${params.toString()}`);
}

export function getMyBookings() {
  return apiGet("/api/bookings/my");
}

export function updateMyBooking(bookingId, payload) {
  return apiPatch(`/api/bookings/${encodeURIComponent(bookingId)}`, payload);
}

export function cancelMyBooking(bookingId, reason) {
  return apiPatch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, { reason });
}

export function acceptRescheduledBooking(bookingId) {
  return apiPatch(`/api/bookings/${encodeURIComponent(bookingId)}/accept-reschedule`, {});
}

export function chooseAnotherSlot(bookingId, payload) {
  return apiPatch(`/api/bookings/${encodeURIComponent(bookingId)}/choose-slot`, payload);
}

export function getAdminBookings(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") params.set("status", String(filters.status));
  if (filters.date) params.set("date", String(filters.date));
  if (filters.resourceType && filters.resourceType !== "ALL") params.set("resourceType", String(filters.resourceType));
  if (filters.resource) params.set("resource", String(filters.resource));
  if (filters.user) params.set("user", String(filters.user));
  if (filters.approvalState && filters.approvalState !== "ALL") params.set("approvalState", String(filters.approvalState));
  if (filters.conflict && filters.conflict !== "ALL") params.set("conflict", String(filters.conflict));
  const qs = params.toString();
  return apiGet(`/api/bookings/admin${qs ? `?${qs}` : ""}`);
}

export function approveBookingByAdmin(bookingId, reason = "") {
  return apiPatch(`/api/bookings/admin/${encodeURIComponent(bookingId)}/approve`, { reason });
}

export function rejectBookingByAdmin(bookingId, reason) {
  return apiPatch(`/api/bookings/admin/${encodeURIComponent(bookingId)}/reject`, { reason });
}

export function cancelBookingByAdmin(bookingId, reason) {
  return apiPatch(`/api/bookings/admin/${encodeURIComponent(bookingId)}/cancel`, { reason });
}

export function rescheduleBookingByAdmin(bookingId, payload) {
  return apiPatch(`/api/bookings/admin/${encodeURIComponent(bookingId)}/reschedule`, payload);
}

export function deleteBookingByAdmin(bookingId) {
  return apiDelete(`/api/bookings/admin/${encodeURIComponent(bookingId)}`);
}

export function getMyBookingQr(bookingId) {
  return apiGet(`/api/bookings/${encodeURIComponent(bookingId)}/qr`);
}

export function validateBookingCheckIn(payload) {
  return apiPost("/api/bookings/admin/checkin/validate", payload);
}

export function confirmBookingCheckIn(payload) {
  return apiPost("/api/bookings/admin/checkin/confirm", payload);
}
