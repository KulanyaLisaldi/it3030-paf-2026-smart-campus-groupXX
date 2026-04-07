import { apiGet, apiPatch, apiPost } from "./http";

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

export function getBookedSlots({ resourceId, bookingDate }) {
  const params = new URLSearchParams({
    resourceId: String(resourceId || ""),
    bookingDate: String(bookingDate || ""),
  });
  return apiGet(`/api/bookings/slots?${params.toString()}`);
}

export function getMyBookings() {
  return apiGet("/api/bookings/my");
}

export function cancelMyBooking(bookingId) {
  return apiPatch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {});
}
