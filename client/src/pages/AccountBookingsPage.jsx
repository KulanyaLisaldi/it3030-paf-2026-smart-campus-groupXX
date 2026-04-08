import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cancelMyBooking, getBookedSlots, getMyBookings, updateMyBooking } from "../api/bookings";
import { getAuthToken } from "../api/http";
import { getResourceById } from "../api/resources";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";

const cardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "28px 32px", width: "100%" };
const sectionHeading = { fontSize: "28px", fontWeight: 650, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" };
const subtleNote = { fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 };
const bookingCardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "18px 20px" };
const bookingChipStyle = { display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" };
const inputDisabled = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#f9fafb", color: "#4b5563", fontSize: "14px", boxSizing: "border-box", cursor: "not-allowed", opacity: 1 };
const inputEditable = { ...inputDisabled, backgroundColor: "#ffffff", color: "#111827", cursor: "text" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "6px" };
const EDIT_SLOT_WINDOW_START = "08:00";
const EDIT_SLOT_WINDOW_END = "18:00";

function toMinutes(hhmm) { const [h, m] = String(hhmm || "").split(":").map(Number); if (!Number.isFinite(h) || !Number.isFinite(m)) return null; return h * 60 + m; }
function toHHMM(totalMinutes) { const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function prettySlot(start, end) { return `${start} - ${end}`; }
function areContiguousSlots(slots, slotDurationMinutes) {
  if (!Array.isArray(slots) || slots.length <= 1) return true;
  const ordered = [...slots].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (let i = 1; i < ordered.length; i += 1) {
    const prevStart = toMinutes(ordered[i - 1].startTime);
    const currentStart = toMinutes(ordered[i].startTime);
    if (prevStart == null || currentStart == null) return false;
    if (currentStart - prevStart !== slotDurationMinutes) return false;
  }
  return true;
}
function formatBookingDate(value) { if (!value) return "—"; const d = new Date(value); if (Number.isNaN(d.getTime())) return value; return d.toLocaleDateString(); }
function formatBookingDateTime(value) { if (!value) return "—"; const d = new Date(value); if (Number.isNaN(d.getTime())) return "—"; return d.toLocaleString(); }
function durationHours(start, end) { const [sh, sm] = String(start || "").split(":").map(Number); const [eh, em] = String(end || "").split(":").map(Number); if (![sh, sm, eh, em].every(Number.isFinite)) return "—"; const minutes = eh * 60 + em - (sh * 60 + sm); if (minutes <= 0) return "—"; return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} h`; }
function bookingStatusChip(statusRaw) { const status = String(statusRaw || "PENDING").toUpperCase(); if (status === "APPROVED") return { backgroundColor: "#dcfce7", color: "#166534" }; if (status === "REJECTED") return { backgroundColor: "#fee2e2", color: "#b91c1c" }; if (status === "CANCELLED") return { backgroundColor: "#e5e7eb", color: "#374151" }; return { backgroundColor: "#dbeafe", color: "#1d4ed8" }; }
function bookingStartDate(booking) {
  const datePart = String(booking?.bookingDate || "");
  const startPart = String(booking?.startTime || "00:00");
  const d = new Date(`${datePart}T${startPart}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function isUpcomingBooking(booking) {
  const start = bookingStartDate(booking);
  if (!start) return false;
  return start > new Date();
}
function canCancelBooking(booking) {
  const status = String(booking?.status || "").toUpperCase();
  return (status === "PENDING" || status === "APPROVED") && isUpcomingBooking(booking);
}
function canEditBooking(booking) {
  return String(booking?.status || "").toUpperCase() === "PENDING" && isUpcomingBooking(booking);
}
function matchesApprovalStateFilter(statusRaw, filterRaw) {
  const status = String(statusRaw || "").toUpperCase();
  const filter = String(filterRaw || "ALL").toUpperCase();
  if (!filter || filter === "ALL") return true;
  if (filter === "UNREVIEWED") return status === "PENDING";
  if (filter === "REVIEWED") return status === "APPROVED" || status === "REJECTED" || status === "CANCELLED";
  return status === filter;
}
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
function normalizeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("blob:")) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return `/${value.replace(/^\.?\/*/, "")}`;
}
function resourcePrimaryImage(resource) {
  if (!resource || typeof resource !== "object") return "";
  const list = [];
  if (Array.isArray(resource.imageUrls)) list.push(...resource.imageUrls);
  if (resource.imageUrl) list.push(resource.imageUrl);
  for (const item of list) {
    const normalized = normalizeImageUrl(item);
    if (normalized) return normalized;
  }
  return "";
}
function bookingEndDate(booking) {
  const datePart = String(booking?.bookingDate || "");
  const endPart = String(booking?.endTime || "00:00");
  const d = new Date(`${datePart}T${endPart}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AccountBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [resourceImageById, setResourceImageById] = useState({});
  const [detailBooking, setDetailBooking] = useState(null);
  const [detailResourceImage, setDetailResourceImage] = useState("");
  const [detailImageLoading, setDetailImageLoading] = useState(false);
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
  const [activeBookingsTab, setActiveBookingsTab] = useState("upcoming");
  const [filters, setFilters] = useState({
    status: "ALL",
    date: "",
    resourceType: "ALL",
    resource: "",
    approvalState: "ALL",
  });

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

  useEffect(() => {
    const ids = Array.from(new Set(bookings.map((b) => String(b?.resourceId || "").trim()).filter(Boolean)));
    const missing = ids.filter((id) => !(id in resourceImageById));
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const resource = await getResourceById(id);
            return [id, resourcePrimaryImage(resource)];
          } catch {
            return [id, ""];
          }
        })
      );
      if (!cancelled) {
        setResourceImageById((prev) => {
          const next = { ...prev };
          for (const [id, image] of entries) next[id] = image;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookings, resourceImageById]);

  useEffect(() => {
    if (!detailBooking?.resourceId) {
      setDetailResourceImage("");
      setDetailImageLoading(false);
      return;
    }
    let cancelled = false;
    setDetailImageLoading(true);
    void (async () => {
      try {
        const resource = await getResourceById(detailBooking.resourceId);
        const image = resourcePrimaryImage(resource);
        if (!cancelled) setDetailResourceImage(image);
      } catch {
        if (!cancelled) setDetailResourceImage("");
      } finally {
        if (!cancelled) setDetailImageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailBooking?.resourceId]);

  const { upcomingBookings, historyBookings } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const history = [];
    for (const booking of bookings) {
      const status = String(booking?.status || "").toUpperCase();
      if (status === "REJECTED" || status === "CANCELLED") {
        history.push(booking);
        continue;
      }
      const end = bookingEndDate(booking);
      if (end && end < now) history.push(booking);
      else upcoming.push(booking);
    }
    return { upcomingBookings: upcoming, historyBookings: history };
  }, [bookings]);

  const resourceTypes = useMemo(() => {
    const set = new Set();
    bookings.forEach((b) => {
      const t = String(b?.resourceType || "").trim().toUpperCase();
      if (t) set.add(t);
    });
    return ["ALL", ...Array.from(set)];
  }, [bookings]);

  const filterBooking = (booking) => {
    const status = String(booking?.status || "").toUpperCase();
    const resourceType = String(booking?.resourceType || "").toUpperCase();
    const resourceText = String(booking?.resourceName || booking?.resourceId || "").toLowerCase();
    const resourceNeedle = String(filters.resource || "").toLowerCase().trim();
    if (filters.status !== "ALL" && status !== String(filters.status || "").toUpperCase()) return false;
    if (filters.date && String(booking?.bookingDate || "") !== filters.date) return false;
    if (filters.resourceType !== "ALL" && resourceType !== String(filters.resourceType || "").toUpperCase()) return false;
    if (resourceNeedle && !resourceText.includes(resourceNeedle)) return false;
    if (!matchesApprovalStateFilter(status, filters.approvalState)) return false;
    return true;
  };

  const filteredUpcomingBookings = useMemo(() => upcomingBookings.filter(filterBooking), [upcomingBookings, filters]);
  const filteredHistoryBookings = useMemo(() => historyBookings.filter(filterBooking), [historyBookings, filters]);

  const openEditBooking = (booking) => {
    setEditBookingTarget(booking);
    setEditBookingDraft({ bookingDate: booking?.bookingDate || "", startTime: booking?.startTime || "", endTime: booking?.endTime || "", purpose: booking?.purpose || "", expectedAttendees: booking?.expectedAttendees == null ? "" : String(booking.expectedAttendees), additionalNotes: booking?.additionalNotes || "" });
    setEditBookingError("");
    setEditSelectedSlotKeys([`${booking?.startTime || ""}-${booking?.endTime || ""}`]);
  };

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

  const editSlots = useMemo(() => {
    const startMin = toMinutes(EDIT_SLOT_WINDOW_START);
    const endMin = toMinutes(EDIT_SLOT_WINDOW_END);
    if (startMin == null || endMin == null || startMin >= endMin) return [];
    const slots = [];
    let cursor = startMin;
    while (cursor + 120 <= endMin) {
      const startTime = toHHMM(cursor);
      const endTime = toHHMM(cursor + 120);
      slots.push({ key: `${startTime}-${endTime}`, startTime, endTime });
      cursor += 120;
    }
    return slots;
  }, []);

  const editSlotStateMap = useMemo(() => {
    const map = {};
    for (const slot of editSlots) {
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
  }, [editSlots, editBookedRanges]);

  const editSelectedOrderedSlots = useMemo(() => {
    const selected = editSlots.filter((s) => editSelectedSlotKeys.includes(s.key));
    return selected.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [editSlots, editSelectedSlotKeys]);

  useEffect(() => {
    if (!editSelectedOrderedSlots.length) {
      setEditBookingDraft((d) => ({ ...d, startTime: "", endTime: "" }));
      return;
    }
    const startTime = editSelectedOrderedSlots[0].startTime;
    const endTime = editSelectedOrderedSlots[editSelectedOrderedSlots.length - 1].endTime;
    setEditBookingDraft((d) => ({ ...d, startTime, endTime }));
  }, [editSelectedOrderedSlots]);

  const handleCancelBooking = async (booking) => {
    if (!booking?.id || !canCancelBooking(booking)) return;
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
    if (!editSelectedSlotKeys.length) { setEditBookingError("Please select one or more available time slots."); return; }
    if (!editBookingDraft.bookingDate || !editBookingDraft.startTime || !editBookingDraft.endTime || !editBookingDraft.purpose.trim()) {
      setEditBookingError("Please complete all required fields.");
      return;
    }
    setEditBusyId(editBookingTarget.id);
    setEditBookingError("");
    try {
      const response = await updateMyBooking(editBookingTarget.id, {
        bookingDate: editBookingDraft.bookingDate,
        startTime: editBookingDraft.startTime,
        endTime: editBookingDraft.endTime,
        purpose: editBookingDraft.purpose.trim(),
        expectedAttendees: editBookingDraft.expectedAttendees === "" ? null : Number(editBookingDraft.expectedAttendees),
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

  const handleEditSlotClick = (slot) => {
    const booked = !!editSlotStateMap[slot.key];
    if (booked) return;
    setEditSelectedSlotKeys((prev) => {
      const nextKeys = prev.includes(slot.key) ? prev.filter((k) => k !== slot.key) : [...prev, slot.key];
      const nextSlots = editSlots.filter((s) => nextKeys.includes(s.key));
      const contiguous = areContiguousSlots(nextSlots, 120);
      if (!contiguous) {
        setEditBookingError("Please select only continuous time slots.");
        return prev;
      }
      return nextKeys;
    });
    setEditBookingError("");
  };

  const renderBookingCard = (booking) => (
    <article key={booking.id || `${booking.resourceId}-${booking.bookingDate}-${booking.startTime}`} style={{ ...bookingCardStyle, border: "1px solid #F5E7C6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "10px" }}>
        <h3 style={{ margin: "0 0 3px 0", fontSize: "17px", fontWeight: 800, color: "#111827" }}>{booking.resourceName || "Resource"}</h3>
        <span style={{ ...bookingChipStyle, ...bookingStatusChip(booking.status) }}>{booking.status || "PENDING"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 170px", gap: "10px 14px", alignItems: "center", fontSize: "14px", color: "#374151" }}>
        <div>
          <div><strong>Resource Type:</strong> {booking.resourceType || "—"}</div>
          <div style={{ marginTop: "8px" }}><strong>Time Range:</strong> {booking.startTime || "—"} - {booking.endTime || "—"}</div>
        </div>
        <div>
          <div><strong>Date:</strong> {formatBookingDate(booking.bookingDate)}</div>
          <div style={{ marginTop: "8px" }}><strong>Status:</strong> {booking.status || "PENDING"}</div>
        </div>
        <div style={{ width: "170px", height: "112px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", justifySelf: "end" }}>
          {resourceImageById[booking.resourceId] ? (
            <img src={resourceImageById[booking.resourceId]} alt="Resource" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>No image</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
        <button type="button" disabled={!canEditBooking(booking) || editBusyId === booking.id} onClick={() => openEditBooking(booking)} style={{ padding: "7px 12px", borderRadius: "8px", border: "none", backgroundColor: canEditBooking(booking) ? "#FA8112" : "#d1d5db", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: !canEditBooking(booking) || editBusyId === booking.id ? "not-allowed" : "pointer" }}>{editBusyId === booking.id ? "Updating..." : "Edit"}</button>
        <button type="button" onClick={() => setDetailBooking(booking)} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#fff", color: "#374151", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>View Details</button>
        <button type="button" disabled={!canCancelBooking(booking) || cancelBusyId === booking.id} onClick={() => { setCancelBookingTarget(booking); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ padding: "7px 12px", borderRadius: "8px", border: "none", backgroundColor: canCancelBooking(booking) ? "#dc2626" : "#d1d5db", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: !canCancelBooking(booking) || cancelBusyId === booking.id ? "not-allowed" : "pointer" }}>{cancelBusyId === booking.id ? "Cancelling..." : "Cancel Booking"}</button>
      </div>
    </article>
  );

  if (!getAuthToken()) return null;

  return (
    <AccountLayout active="bookings">
      <h1 style={sectionHeading}>My bookings</h1>
      <p style={subtleNote}>You can view only your own bookings and cancel pending/approved requests.</p>
      {bookingsLoading && <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Loading bookings...</p></div>}
      {!bookingsLoading && bookingsError && <div style={cardStyle}><p style={{ margin: 0, color: "#b91c1c", fontSize: "15px", fontWeight: 700 }}>{bookingsError}</p></div>}
      {!bookingsLoading && !bookingsError && bookings.length === 0 && <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No bookings yet.</p></div>}
      {!bookingsLoading && !bookingsError && bookings.length > 0 && (
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
              <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))} style={{ ...inputEditable, height: 40 }}>
                <option value="ALL">Status: All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} style={{ ...inputEditable, height: 40 }} />
              <select value={filters.resourceType} onChange={(e) => setFilters((s) => ({ ...s, resourceType: e.target.value }))} style={{ ...inputEditable, height: 40 }}>
                {resourceTypes.map((t) => <option key={t} value={t}>{t === "ALL" ? "Resource Type: All" : t}</option>)}
              </select>
              <input value={filters.resource} onChange={(e) => setFilters((s) => ({ ...s, resource: e.target.value }))} style={{ ...inputEditable, height: 40 }} placeholder="Resource name/id" />
              <select value={filters.approvalState} onChange={(e) => setFilters((s) => ({ ...s, approvalState: e.target.value }))} style={{ ...inputEditable, height: 40 }}>
                <option value="ALL">Approval State: All</option>
                <option value="UNREVIEWED">Unreviewed</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setFilters({ status: "ALL", date: "", resourceType: "ALL", resource: "", approvalState: "ALL" })}
                style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: "pointer" }}
              >
                Reset
              </button>
            </div>
          </section>

          <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e5e7eb", marginBottom: 12, paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setActiveBookingsTab("upcoming")}
              style={{
                border: "1px solid",
                borderColor: activeBookingsTab === "upcoming" ? "#fb923c" : "#e5e7eb",
                background: activeBookingsTab === "upcoming" ? "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)" : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: "15px",
                fontWeight: 800,
                color: activeBookingsTab === "upcoming" ? "#111827" : "#6b7280",
                boxShadow: activeBookingsTab === "upcoming" ? "inset 0 0 0 1px rgba(251,146,60,0.15)" : "none",
                cursor: "pointer",
              }}
            >
              Upcoming Bookings ({filteredUpcomingBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveBookingsTab("history")}
              style={{
                border: "1px solid",
                borderColor: activeBookingsTab === "history" ? "#94a3b8" : "#e5e7eb",
                background: activeBookingsTab === "history" ? "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)" : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: "15px",
                fontWeight: 800,
                color: activeBookingsTab === "history" ? "#111827" : "#6b7280",
                boxShadow: activeBookingsTab === "history" ? "inset 0 0 0 1px rgba(148,163,184,0.2)" : "none",
                cursor: "pointer",
              }}
            >
              Booking History ({filteredHistoryBookings.length})
            </button>
          </div>

          {activeBookingsTab === "upcoming" && (
            filteredUpcomingBookings.length === 0 ? (
              <div style={{ ...cardStyle, padding: "16px 18px" }}><p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>No upcoming bookings.</p></div>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>{filteredUpcomingBookings.map(renderBookingCard)}</div>
            )
          )}

          {activeBookingsTab === "history" && (
            filteredHistoryBookings.length === 0 ? (
              <div style={{ ...cardStyle, padding: "16px 18px" }}><p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>No booking history yet.</p></div>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>{filteredHistoryBookings.map(renderBookingCard)}</div>
            )
          )}
        </div>
      )}
      {detailBooking && (
        <div role="dialog" aria-modal="true" onClick={() => setDetailBooking(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "820px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px 18px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>Booking Details</h2>
              <button type="button" onClick={() => setDetailBooking(null)} style={{ border: "1px solid #d1d5db", backgroundColor: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontWeight: 700, color: "#374151" }}>Close</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "14px" }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", background: "#f8fafc", height: "170px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {detailImageLoading ? (
                  <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Loading image...</span>
                ) : detailResourceImage ? (
                  <img src={detailResourceImage} alt="Resource" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>No image available</span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: "14px", color: "#374151" }}>
                <div><strong>Booking ID:</strong> {detailBooking.id || "—"}</div>
                <div><strong>Resource Name:</strong> {detailBooking.resourceName || "—"}</div>
                <div><strong>Resource Type:</strong> {detailBooking.resourceType || "—"}</div>
                <div><strong>Date:</strong> {formatBookingDate(detailBooking.bookingDate)}</div>
                <div><strong>Time Range:</strong> {detailBooking.startTime || "—"} - {detailBooking.endTime || "—"}</div>
                <div><strong>Status:</strong> {detailBooking.status || "PENDING"}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {detailBooking.purpose || "—"}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>{cancellationOrRejectionLabel(detailBooking)}:</strong> {cancellationOrRejectionReason(detailBooking) || "—"}</div>
                <div><strong>Created Date:</strong> {formatBookingDateTime(detailBooking.createdAt)}</div>
                <div><strong>Total Duration:</strong> {durationHours(detailBooking.startTime, detailBooking.endTime)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {cancelBookingTarget && <div role="dialog" aria-modal="true" onClick={() => { if (cancelBusyId) return; setCancelBookingTarget(null); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1300 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "560px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}><h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Cancel Booking</h3><p style={{ margin: "0 0 12px 0", color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>Are you sure you want to cancel this booking?</p><label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Cancellation reason</label><textarea value={cancelReasonDraft} onChange={(e) => { setCancelReasonDraft(e.target.value); setCancelReasonError(""); }} maxLength={500} rows={4} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} placeholder="Please provide the reason for cancellation..." />{cancelReasonError && <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{cancelReasonError}</p>}<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}><button type="button" disabled={!!cancelBusyId} onClick={() => { setCancelBookingTarget(null); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: cancelBusyId ? "not-allowed" : "pointer" }}>Close</button><button type="button" disabled={cancelBusyId === cancelBookingTarget.id} onClick={() => handleCancelBooking(cancelBookingTarget)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: cancelBusyId === cancelBookingTarget.id ? "not-allowed" : "pointer" }}>{cancelBusyId === cancelBookingTarget.id ? "Cancelling..." : "Confirm Cancel"}</button></div></div></div>}
      {editBookingTarget && <div role="dialog" aria-modal="true" onClick={() => { if (editBusyId) return; setEditBookingTarget(null); setEditBookingError(""); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1250 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "620px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}><h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Edit Booking</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}><div><label style={labelStyle}>Date</label><input type="date" value={editBookingDraft.bookingDate} onChange={(e) => { setEditBookingDraft((d) => ({ ...d, bookingDate: e.target.value })); setEditSelectedSlotKeys([]); }} style={inputEditable} /></div><div /><div><label style={labelStyle}>Start Time</label><input type="time" value={editBookingDraft.startTime} readOnly disabled style={inputDisabled} /></div><div><label style={labelStyle}>End Time</label><input type="time" value={editBookingDraft.endTime} readOnly disabled style={inputDisabled} /></div><div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Available Time Slots</label>{editSlotsLoading && <p style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Loading available slots...</p>}{!editSlotsLoading && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>{editSlots.map((slot) => { const booked = !!editSlotStateMap[slot.key]; const selected = editSelectedSlotKeys.includes(slot.key); return <button key={slot.key} type="button" disabled={booked} onClick={() => handleEditSlotClick(slot)} style={{ height: 38, borderRadius: 8, border: selected ? "2px solid #0369a1" : "1px solid #d1d5db", background: booked ? "#e5e7eb" : selected ? "#e0f2fe" : "#fff", color: booked ? "#6b7280" : selected ? "#0c4a6e" : "#111827", fontWeight: 700, fontSize: "12px", cursor: booked ? "not-allowed" : "pointer" }}>{prettySlot(slot.startTime, slot.endTime)} {booked ? "• Booked" : ""}</button>; })}</div>}<p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>Select one or more continuous slots. Start/End time will be combined automatically.</p></div><div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Purpose</label><textarea rows={3} value={editBookingDraft.purpose} onChange={(e) => setEditBookingDraft((d) => ({ ...d, purpose: e.target.value }))} style={{ ...inputEditable, height: "auto", resize: "vertical" }} /></div><div><label style={labelStyle}>Expected Attendees</label><input value={editBookingDraft.expectedAttendees} onChange={(e) => setEditBookingDraft((d) => ({ ...d, expectedAttendees: e.target.value.replace(/[^\d]/g, "") }))} style={inputEditable} /></div><div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Additional Notes</label><textarea rows={3} value={editBookingDraft.additionalNotes} onChange={(e) => setEditBookingDraft((d) => ({ ...d, additionalNotes: e.target.value }))} style={{ ...inputEditable, height: "auto", resize: "vertical" }} /></div></div>{editBookingError && <p style={{ margin: "10px 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{editBookingError}</p>}<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}><button type="button" disabled={!!editBusyId} onClick={() => { setEditBookingTarget(null); setEditBookingError(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: editBusyId ? "not-allowed" : "pointer" }}>Close</button><button type="button" disabled={editBusyId === editBookingTarget.id} onClick={handleUpdateBooking} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#FA8112", color: "#fff", fontWeight: 700, cursor: editBusyId === editBookingTarget.id ? "not-allowed" : "pointer" }}>{editBusyId === editBookingTarget.id ? "Updating..." : "Update Booking"}</button></div></div></div>}
    </AccountLayout>
  );
}
