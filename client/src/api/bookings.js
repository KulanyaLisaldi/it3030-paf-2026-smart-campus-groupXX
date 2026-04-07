import { apiGet, apiPost } from "./http";

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
