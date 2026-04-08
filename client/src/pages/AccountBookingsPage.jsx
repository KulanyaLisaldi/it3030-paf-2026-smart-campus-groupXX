import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cancelMyBooking, getBookedSlots, getMyBookings, updateMyBooking } from "../api/bookings";
import { getAuthToken } from "../api/http";
import { getResourceById } from "../api/resources";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";

const cardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "28px 32px", maxWidth: "980px" };
const sectionHeading = { fontSize: "28px", fontWeight: 650, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" };
const subtleNote = { fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 };
const bookingCardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "18px 20px" };
const bookingChipStyle = { display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" };
const inputDisabled = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#f9fafb", color: "#4b5563", fontSize: "14px", boxSizing: "border-box", cursor: "not-allowed", opacity: 1 };
const inputEditable = { ...inputDisabled, backgroundColor: "#ffffff", color: "#111827" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "6px" };
const SLOT_DURATION_HOURS = 2;
const DEFAULT_WINDOW_START = "08:00";
const DEFAULT_WINDOW_END = "18:00";

function toMinutes(hhmm) { const [h, m] = String(hhmm || "").split(":").map(Number); if (!Number.isFinite(h) || !Number.isFinite(m)) return null; return h * 60 + m; }
function toHHMM(totalMinutes) { const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function prettySlot(start, end) { return `${start} - ${end}`; }
function parseAvailabilityWindow(raw) {
  const text = String(raw || "").trim();
  const match = text.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (!match) return { start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
  const start = match[1];
  const end = match[2];
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null || s >= e) return { start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
  return { start, end };
}
function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function slotKeysFullyInsideRange(allSlots, startHHMM, endHHMM) {
  const s = toMinutes(startHHMM);
  const e = toMinutes(endHHMM);
  if (s == null || e == null || s >= e) return [];
  const inside = allSlots.filter((slot) => {
    const ss = toMinutes(slot.startTime);
    const se = toMinutes(slot.endTime);
    if (ss == null || se == null) return false;
    return ss >= s && se <= e;
  });
  return inside.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)).map((x) => x.key);
}
function formatBookingDate(value) { if (!value) return "—"; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toLocaleDateString(); }
function formatBookingDateTime(value) { if (!value) return "—"; const d = new Date(value); if (Number.isNaN(d.getTime())) return "—"; return d.toLocaleString(); }
function durationHours(start, end) { const [sh, sm] = String(start || "").split(":").map(Number); const [eh, em] = String(end || "").split(":").map(Number); if (![sh, sm, eh, em].every(Number.isFinite)) return "—"; const minutes = eh * 60 + em - (sh * 60 + sm); if (minutes <= 0) return "—"; return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} h`; }
function bookingStatusChip(statusRaw) { const status = String(statusRaw || "PENDING").toUpperCase(); if (status === "APPROVED") return { backgroundColor: "#dcfce7", color: "#166534" }; if (status === "REJECTED") return { backgroundColor: "#fee2e2", color: "#b91c1c" }; if (status === "CANCELLED") return { backgroundColor: "#e5e7eb", color: "#374151" }; return { backgroundColor: "#dbeafe", color: "#1d4ed8" }; }
function canCancelBooking(statusRaw) { const status = String(statusRaw || "").toUpperCase(); return status === "PENDING" || status === "APPROVED"; }
function canEditBooking(statusRaw) { return String(statusRaw || "").toUpperCase() === "PENDING"; }
function cancellationOrRejectionReason(booking) {
  const status = String(booking?.status || "").toUpperCase();
  if (status === "REJECTED") return booking?.reviewReason || "";
  if (status === "CANCELLED") return booking?.cancellationReason || booking?.reviewReason || "";
  return booking?.reviewReason || booking?.cancellationReason || "";
}
function cancellationOrRejectionLabel(booking) {
  const status = String(booking?.status || "").toUpperCase();
  if (status === "REJECTED") return "Admin rejection reason";
  if (status === "CANCELLED") return booking?.cancellationReason ? "Your cancellation reason" : "Admin cancellation reason";
  return "Reason";
}

export default function AccountBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [detailBooking, setDetailBooking] = useState(null);
  const [cancelBusyId, setCancelBusyId] = useState("");
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");
  const [editBookingTarget, setEditBookingTarget] = useState(null);
  const [editBookingDraft, setEditBookingDraft] = useState({ bookingDate: "", startTime: "", endTime: "", purpose: "", expectedAttendees: "", additionalNotes: "" });
  const [editBookingError, setEditBookingError] = useState("");
  const [editBusyId, setEditBusyId] = useState("");
  const [editSlotsLoading, setEditSlotsLoading] = useState(false);
  const [editBookedRanges, setEditBookedRanges] = useState([]);
  const [editSelectedSlotKeys, setEditSelectedSlotKeys] = useState([]);
  const [editResource, setEditResource] = useState(null);
  const [editResourceLoading, setEditResourceLoading] = useState(false);
  const [editSlotSeedDone, setEditSlotSeedDone] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      rememberPostLoginPath(location.pathname);
      navigate("/signin", { replace: true, state: { from: location.pathname } });
      return;
    }
    const loadBookings = async () => {
      setBookingsLoading(true);
      setBookingsError("");
      try {
        const data = await getMyBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        setBookings([]);
        setBookingsError(e?.message || "Could not load bookings.");
      } finally {
        setBookingsLoading(false);
      }
    };
    void loadBookings();
  }, [navigate, location.pathname]);

  const openEditBooking = (booking) => {
    setEditBookingTarget(booking);
    setEditBookingDraft({ bookingDate: booking?.bookingDate || "", startTime: booking?.startTime || "", endTime: booking?.endTime || "", purpose: booking?.purpose || "", expectedAttendees: booking?.expectedAttendees == null ? "" : String(booking.expectedAttendees), additionalNotes: booking?.additionalNotes || "" });
    setEditBookingError("");
    setEditSelectedSlotKeys([]);
    setEditSlotSeedDone(false);
    setEditResource(null);
    setEditResourceLoading(true);
  };

  useEffect(() => {
    if (!editBookingTarget?.resourceId) {
      setEditResource(null);
      setEditResourceLoading(false);
      return;
    }
    let cancelled = false;
    setEditResourceLoading(true);
    void (async () => {
      try {
        const data = await getResourceById(editBookingTarget.resourceId);
        if (!cancelled) setEditResource(data && typeof data === "object" ? data : null);
      } catch {
        if (!cancelled) setEditResource(null);
      } finally {
        if (!cancelled) setEditResourceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editBookingTarget?.resourceId]);

  useEffect(() => {
    if (!editBookingTarget?.resourceId || !editBookingDraft.bookingDate) { setEditBookedRanges([]); return; }
    const load = async () => {
      setEditSlotsLoading(true);
      try {
        const data = await getBookedSlots({ resourceId: editBookingTarget.resourceId, bookingDate: editBookingDraft.bookingDate, excludeBookingId: editBookingTarget.id });
        setEditBookedRanges(Array.isArray(data?.bookedSlots) ? data.bookedSlots : []);
      } catch {
        setEditBookedRanges([]);
      } finally {
        setEditSlotsLoading(false);
      }
    };
    void load();
  }, [editBookingTarget?.id, editBookingTarget?.resourceId, editBookingDraft.bookingDate]);

  const editAvailabilityWindow = useMemo(
    () => parseAvailabilityWindow(editResource?.availability || editResource?.availabilityText),
    [editResource]
  );

  const editAllSlots = useMemo(() => {
    const startMin = toMinutes(editAvailabilityWindow.start);
    const endMin = toMinutes(editAvailabilityWindow.end);
    if (startMin == null || endMin == null || startMin >= endMin) return [];
    const isToday = editBookingDraft.bookingDate === todayIsoDate();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const effectiveStartMin = isToday ? Math.max(startMin, currentMinutes) : startMin;
    const slots = [];
    let cursor = effectiveStartMin;
    const remainder = cursor % (SLOT_DURATION_HOURS * 60);
    if (remainder !== 0) cursor += SLOT_DURATION_HOURS * 60 - remainder;
    while (cursor + SLOT_DURATION_HOURS * 60 <= endMin) {
      const startTime = toHHMM(cursor);
      const endTime = toHHMM(cursor + SLOT_DURATION_HOURS * 60);
      slots.push({ key: `${startTime}-${endTime}`, startTime, endTime });
      cursor += SLOT_DURATION_HOURS * 60;
    }
    return slots;
  }, [editAvailabilityWindow, editBookingDraft.bookingDate]);

  useEffect(() => {
    if (!editBookingTarget || editSlotSeedDone || editResourceLoading) return;
    if (!editBookingDraft.bookingDate) return;
    if (!editAllSlots.length) return;
    const keys = slotKeysFullyInsideRange(editAllSlots, editBookingTarget.startTime, editBookingTarget.endTime);
    setEditSelectedSlotKeys(keys);
    setEditSlotSeedDone(true);
  }, [editBookingTarget, editBookingDraft.bookingDate, editAllSlots, editSlotSeedDone, editResourceLoading]);

  const editSlotStateMap = useMemo(() => {
    const map = {};
    for (const slot of editAllSlots) {
      const s = toMinutes(slot.startTime);
      const e = toMinutes(slot.endTime);
      map[slot.key] = editBookedRanges.some((r) => {
        const rs = toMinutes(r.startTime);
        const re = toMinutes(r.endTime);
        if (s == null || e == null || rs == null || re == null) return false;
        return s < re && e > rs;
      });
    }
    return map;
  }, [editAllSlots, editBookedRanges]);

  const editOrderedSelectedSlots = useMemo(() => {
    const selected = editAllSlots.filter((s) => editSelectedSlotKeys.includes(s.key));
    return selected.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [editAllSlots, editSelectedSlotKeys]);
  const editSelectedStartTime = editOrderedSelectedSlots.length > 0 ? editOrderedSelectedSlots[0].startTime : "";
  const editSelectedEndTime = editOrderedSelectedSlots.length > 0 ? editOrderedSelectedSlots[editOrderedSelectedSlots.length - 1].endTime : "";

  const editResourceType = String(editResource?.type || "").toUpperCase();
  const editAttendeesApplicable = editResourceType && editResourceType !== "EQUIPMENT";

  const handleEditSlotClick = (slot) => {
    if (editSlotStateMap[slot.key]) return;
    setEditSelectedSlotKeys((prev) => (prev.includes(slot.key) ? prev.filter((k) => k !== slot.key) : [...prev, slot.key]));
    setEditBookingError("");
  };

  const handleCancelBooking = async (booking) => {
    if (!booking?.id || !canCancelBooking(booking.status)) return;
    const reason = (cancelReasonDraft || "").trim();
    if (!reason) { setCancelReasonError("Cancellation reason is required."); return; }
    setCancelBusyId(booking.id);
    try {
      const response = await cancelMyBooking(booking.id, reason);
      const updated = response?.booking;
      if (updated?.id) {
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        if (detailBooking?.id === updated.id) setDetailBooking(updated);
      }
      setCancelBookingTarget(null);
      setCancelReasonDraft("");
      setCancelReasonError("");
    } catch (e) {
      setCancelReasonError(e?.message || "Could not cancel booking");
    } finally {
      setCancelBusyId("");
    }
  };

  const handleUpdateBooking = async () => {
    if (!editBookingTarget?.id) return;
    if (!editSelectedSlotKeys.length || !editSelectedStartTime || !editSelectedEndTime) {
      setEditBookingError("Select one or more available time slots.");
      return;
    }
    if (!editBookingDraft.bookingDate || !editBookingDraft.purpose.trim()) {
      setEditBookingError("Please complete all required fields.");
      return;
    }
    if (editAttendeesApplicable && editBookingDraft.expectedAttendees === "") {
      setEditBookingError("Expected attendees is required for this resource.");
      return;
    }
    setEditBusyId(editBookingTarget.id);
    setEditBookingError("");
    try {
      const response = await updateMyBooking(editBookingTarget.id, {
        bookingDate: editBookingDraft.bookingDate,
        startTime: editSelectedStartTime,
        endTime: editSelectedEndTime,
        purpose: editBookingDraft.purpose.trim(),
        expectedAttendees: editAttendeesApplicable && editBookingDraft.expectedAttendees !== "" ? Number(editBookingDraft.expectedAttendees) : null,
        additionalNotes: editBookingDraft.additionalNotes.trim(),
      });
      const updated = response?.booking;
      if (updated?.id) {
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        if (detailBooking?.id === updated.id) setDetailBooking(updated);
      }
      setEditBookingTarget(null);
      setEditBookingError("");
    } catch (e) {
      setEditBookingError(e?.message || "Could not update booking.");
    } finally {
      setEditBusyId("");
    }
  };

  if (!getAuthToken()) return null;

  return (
    <AccountLayout active="bookings">
      <h1 style={sectionHeading}>My bookings</h1>
      <p style={subtleNote}>You can view only your own bookings and cancel pending/approved requests.</p>
      {bookingsLoading && <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Loading bookings...</p></div>}
      {!bookingsLoading && bookingsError && <div style={cardStyle}><p style={{ margin: 0, color: "#b91c1c", fontSize: "15px", fontWeight: 700 }}>{bookingsError}</p></div>}
      {!bookingsLoading && !bookingsError && bookings.length === 0 && <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No bookings yet.</p></div>}
      {!bookingsLoading && !bookingsError && bookings.length > 0 && (
        <div style={{ display: "grid", gap: "14px", maxWidth: "980px" }}>
          {bookings.map((booking) => (
            <article key={booking.id || `${booking.resourceId}-${booking.bookingDate}-${booking.startTime}`} style={{ ...bookingCardStyle, border: "1px solid #F5E7C6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "10px" }}>
                <h3 style={{ margin: "0 0 3px 0", fontSize: "17px", fontWeight: 800, color: "#111827" }}>{booking.resourceName || "Resource"}</h3>
                <span style={{ ...bookingChipStyle, ...bookingStatusChip(booking.status) }}>{booking.status || "PENDING"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: "14px", color: "#374151" }}>
                <div><strong>Resource Type:</strong> {booking.resourceType || "—"}</div>
                <div><strong>Date:</strong> {formatBookingDate(booking.bookingDate)}</div>
                <div><strong>Time Range:</strong> {booking.startTime || "—"} - {booking.endTime || "—"}</div>
                <div><strong>Status:</strong> {booking.status || "PENDING"}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                <button type="button" disabled={!canEditBooking(booking.status) || editBusyId === booking.id} onClick={() => openEditBooking(booking)} style={{ padding: "7px 12px", borderRadius: "8px", border: "none", backgroundColor: canEditBooking(booking.status) ? "#FA8112" : "#d1d5db", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: !canEditBooking(booking.status) || editBusyId === booking.id ? "not-allowed" : "pointer" }}>{editBusyId === booking.id ? "Updating..." : "Edit"}</button>
                <button type="button" onClick={() => setDetailBooking(booking)} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#fff", color: "#374151", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>View Details</button>
                <button type="button" disabled={!canCancelBooking(booking.status) || cancelBusyId === booking.id} onClick={() => { setCancelBookingTarget(booking); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ padding: "7px 12px", borderRadius: "8px", border: "none", backgroundColor: canCancelBooking(booking.status) ? "#dc2626" : "#d1d5db", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: !canCancelBooking(booking.status) || cancelBusyId === booking.id ? "not-allowed" : "pointer" }}>{cancelBusyId === booking.id ? "Cancelling..." : "Cancel Booking"}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {detailBooking && <div role="dialog" aria-modal="true" onClick={() => setDetailBooking(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1200 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "760px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px 18px 14px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}><h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>Booking Details</h2><button type="button" onClick={() => setDetailBooking(null)} style={{ border: "1px solid #d1d5db", backgroundColor: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontWeight: 700, color: "#374151" }}>Close</button></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: "14px", color: "#374151" }}><div><strong>Booking ID:</strong> {detailBooking.id || "—"}</div><div><strong>Resource Name:</strong> {detailBooking.resourceName || "—"}</div><div><strong>Resource Type:</strong> {detailBooking.resourceType || "—"}</div><div><strong>Date:</strong> {formatBookingDate(detailBooking.bookingDate)}</div><div><strong>Time Range:</strong> {detailBooking.startTime || "—"} - {detailBooking.endTime || "—"}</div><div><strong>Status:</strong> {detailBooking.status || "PENDING"}</div><div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {detailBooking.purpose || "—"}</div><div style={{ gridColumn: "1 / -1" }}><strong>{cancellationOrRejectionLabel(detailBooking)}:</strong> {cancellationOrRejectionReason(detailBooking) || "—"}</div><div><strong>Created Date:</strong> {formatBookingDateTime(detailBooking.createdAt)}</div><div><strong>Total Duration:</strong> {durationHours(detailBooking.startTime, detailBooking.endTime)}</div></div></div></div>}
      {cancelBookingTarget && <div role="dialog" aria-modal="true" onClick={() => { if (cancelBusyId) return; setCancelBookingTarget(null); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1300 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "560px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}><h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Cancel Booking</h3><p style={{ margin: "0 0 12px 0", color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>Are you sure you want to cancel this booking?</p><label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Cancellation reason</label><textarea value={cancelReasonDraft} onChange={(e) => { setCancelReasonDraft(e.target.value); setCancelReasonError(""); }} maxLength={500} rows={4} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} placeholder="Please provide the reason for cancellation..." />{cancelReasonError && <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{cancelReasonError}</p>}<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}><button type="button" disabled={!!cancelBusyId} onClick={() => { setCancelBookingTarget(null); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: cancelBusyId ? "not-allowed" : "pointer" }}>Close</button><button type="button" disabled={cancelBusyId === cancelBookingTarget.id} onClick={() => handleCancelBooking(cancelBookingTarget)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: cancelBusyId === cancelBookingTarget.id ? "not-allowed" : "pointer" }}>{cancelBusyId === cancelBookingTarget.id ? "Cancelling..." : "Confirm Cancel"}</button></div></div></div>}
      {editBookingTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (editBusyId) return;
            setEditBookingTarget(null);
            setEditBookingError("");
            setEditResource(null);
          }}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1250 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "640px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Edit Booking</h3>
            {editResourceLoading && <p style={{ margin: "0 0 10px 0", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Loading resource schedule…</p>}
            {!editResourceLoading && !editResource && (
              <p style={{ margin: "0 0 10px 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>Could not load resource details. Time slots use the default availability window (08:00–18:00).</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  min={todayIsoDate()}
                  value={editBookingDraft.bookingDate}
                  onChange={(e) => {
                    setEditBookingDraft((d) => ({ ...d, bookingDate: e.target.value }));
                    setEditSelectedSlotKeys([]);
                    setEditSlotSeedDone(true);
                  }}
                  style={inputEditable}
                />
              </div>
              <div />
              <div>
                <label style={labelStyle}>Start Time</label>
                <input type="time" value={editSelectedStartTime} readOnly disabled style={inputDisabled} />
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input type="time" value={editSelectedEndTime} readOnly disabled style={inputDisabled} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  Time Slots ({editAvailabilityWindow.start} - {editAvailabilityWindow.end})
                </label>
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#475569", fontWeight: 600 }}>Select one or more available time slots</p>
                {(editSlotsLoading || editResourceLoading) && (
                  <p style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Loading booked slots…</p>
                )}
                {!editSlotsLoading && !editResourceLoading && editAllSlots.length === 0 && (
                  <p style={{ margin: "0 0 8px 0", color: "#b91c1c", fontSize: "13px", fontWeight: 700 }}>No time slots configured for this resource.</p>
                )}
                {!editSlotsLoading && !editResourceLoading && editAllSlots.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                    {editAllSlots.map((slot) => {
                      const isBooked = !!editSlotStateMap[slot.key];
                      const isSelected = editSelectedSlotKeys.includes(slot.key);
                      return (
                        <button
                          key={slot.key}
                          type="button"
                          onClick={() => handleEditSlotClick(slot)}
                          disabled={isBooked}
                          title={isBooked ? "Booked slot" : "Click to select slot"}
                          style={{
                            height: 42,
                            borderRadius: 10,
                            border: isSelected ? "2px solid #0369a1" : "1px solid #cbd5e1",
                            background: isBooked ? "#e5e7eb" : isSelected ? "#e0f2fe" : "#ffffff",
                            color: isBooked ? "#6b7280" : isSelected ? "#0c4a6e" : "#0f172a",
                            fontWeight: 800,
                            cursor: isBooked ? "not-allowed" : "pointer",
                            transition: "all 0.15s ease",
                            fontSize: "12px",
                          }}
                          onMouseEnter={(ev) => {
                            if (!isBooked && !isSelected) ev.currentTarget.style.background = "#f8fafc";
                          }}
                          onMouseLeave={(ev) => {
                            if (!isBooked && !isSelected) ev.currentTarget.style.background = "#ffffff";
                          }}
                        >
                          {prettySlot(slot.startTime, slot.endTime)} {isBooked ? "• Booked" : ""}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!editSlotsLoading && !editResourceLoading && editAllSlots.length > 0 && editAllSlots.every((s) => editSlotStateMap[s.key]) && (
                  <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 700 }}>No slots available</p>
                )}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Purpose</label>
                <textarea rows={3} value={editBookingDraft.purpose} onChange={(e) => setEditBookingDraft((d) => ({ ...d, purpose: e.target.value }))} style={{ ...inputEditable, height: "auto", resize: "vertical" }} />
              </div>
              <div>
                <label style={labelStyle}>Expected Attendees</label>
                <input
                  value={editBookingDraft.expectedAttendees}
                  onChange={(e) => setEditBookingDraft((d) => ({ ...d, expectedAttendees: e.target.value.replace(/[^\d]/g, "") }))}
                  style={inputEditable}
                  placeholder={editAttendeesApplicable ? "Enter number of attendees" : "Not required for equipment"}
                  disabled={!editAttendeesApplicable}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Additional Notes</label>
                <textarea rows={3} value={editBookingDraft.additionalNotes} onChange={(e) => setEditBookingDraft((d) => ({ ...d, additionalNotes: e.target.value }))} style={{ ...inputEditable, height: "auto", resize: "vertical" }} />
              </div>
            </div>
            {editBookingError && <p style={{ margin: "10px 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{editBookingError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button
                type="button"
                disabled={!!editBusyId}
                onClick={() => {
                  setEditBookingTarget(null);
                  setEditBookingError("");
                  setEditResource(null);
                }}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: editBusyId ? "not-allowed" : "pointer" }}
              >
                Close
              </button>
              <button
                type="button"
                disabled={editBusyId === editBookingTarget.id || editResourceLoading}
                onClick={handleUpdateBooking}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#FA8112", color: "#fff", fontWeight: 700, cursor: editBusyId === editBookingTarget.id ? "not-allowed" : "pointer" }}
              >
                {editBusyId === editBookingTarget.id ? "Updating..." : "Update Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
