import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { cancelMyBooking, getBookedSlots, getMyBookingQr, getMyBookings, updateMyBooking } from "../api/bookings";
import { getAuthToken } from "../api/http";
import { getResourceById } from "../api/resources";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";

const cardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "28px 32px", width: "100%" };
const sectionHeading = { fontSize: "28px", fontWeight: 650, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" };
const bookingCardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "18px 20px", width: "100%", margin: "0" };
const bookingChipStyle = { display: "inline-flex", alignItems: "center", padding: "5px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase" };
const bookingFieldLabelStyle = { fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" };
const bookingFieldValueStyle = { marginTop: "2px", fontSize: "14px", fontWeight: 600, color: "#14213D" };
const inputDisabled = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#f9fafb", color: "#4b5563", fontSize: "14px", boxSizing: "border-box", cursor: "not-allowed", opacity: 1 };
const inputEditable = { ...inputDisabled, backgroundColor: "#ffffff", color: "#111827", cursor: "text" };
const filterBarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
  gap: "12px",
  alignItems: "stretch",
  width: "100%",
};
const bookingsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  alignItems: "start",
};
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "6px" };
const EDIT_SLOT_WINDOW_START = "08:00";
const EDIT_SLOT_WINDOW_END = "18:00";
const EDIT_SLOT_DURATION_MINUTES = 60;

function toMinutes(hhmm) { const [h, m] = String(hhmm || "").split(":").map(Number); if (!Number.isFinite(h) || !Number.isFinite(m)) return null; return h * 60 + m; }
function toHHMM(totalMinutes) { const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function prettySlot(start, end) { return `${start} - ${end}`; }
function parseClockToken(tokenRaw) {
  const token = String(tokenRaw || "").trim().toLowerCase().replace(".", ":");
  const m = token.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const suffix = m[3] || "";
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (suffix) {
    if (hour < 0 || hour > 12) return null;
    if (hour === 0) hour = 12;
    if (suffix === "am") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  if (hour === 24 && minute === 0) return 24 * 60;
  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}
function parseAvailabilityWindow(raw) {
  const text = String(raw || "").trim();
  const timeTokens = text.match(/\d{1,2}[:.]\d{2}\s*(?:am|pm)?/gi) || [];
  if (timeTokens.length < 2) return { start: EDIT_SLOT_WINDOW_START, end: EDIT_SLOT_WINDOW_END };
  const startToken = timeTokens[0];
  const endToken = timeTokens[1];
  const startMin = parseClockToken(startToken);
  let endMin = parseClockToken(endToken);
  if (endMin === 0 && /am/i.test(endToken)) endMin = 24 * 60;
  if (startMin == null || endMin == null || startMin >= endMin) {
    return { start: EDIT_SLOT_WINDOW_START, end: EDIT_SLOT_WINDOW_END };
  }
  return { start: toHHMM(startMin), end: toHHMM(endMin) };
}
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
function bookingStatusChip(statusRaw) { const status = String(statusRaw || "PENDING").toUpperCase(); if (status === "CHECKED_IN") return { backgroundColor: "#ccfbf1", color: "#0f766e" }; if (status === "APPROVED") return { backgroundColor: "#dcfce7", color: "#166534" }; if (status === "REJECTED") return { backgroundColor: "#fee2e2", color: "#b91c1c" }; if (status === "CANCELLED") return { backgroundColor: "#e5e7eb", color: "#374151" }; return { backgroundColor: "#dbeafe", color: "#1d4ed8" }; }
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
function resourceImageUrls(resource) {
  if (!resource || typeof resource !== "object") return [];
  const list = [];
  if (Array.isArray(resource.imageUrls)) list.push(...resource.imageUrls);
  if (resource.imageUrl) list.push(resource.imageUrl);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const normalized = normalizeImageUrl(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
function bookingEndDate(booking) {
  const datePart = String(booking?.bookingDate || "");
  const endPart = String(booking?.endTime || "00:00");
  const d = new Date(`${datePart}T${endPart}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function deriveSlotKeysFromRange(slots, startTime, endTime) {
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  if (!Array.isArray(slots) || !slots.length || startMin == null || endMin == null || startMin >= endMin) return [];
  const matched = slots.filter((slot) => {
    const s = toMinutes(slot.startTime);
    const e = toMinutes(slot.endTime);
    if (s == null || e == null) return false;
    return s >= startMin && e <= endMin;
  });
  const coveredMinutes = matched.reduce((acc, slot) => {
    const s = toMinutes(slot.startTime);
    const e = toMinutes(slot.endTime);
    return acc + (e - s);
  }, 0);
  if (coveredMinutes !== endMin - startMin) return [];
  return matched.map((slot) => slot.key);
}

export default function AccountBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [resourceImageById, setResourceImageById] = useState({});
  const [resourceAvailabilityById, setResourceAvailabilityById] = useState({});
  const [detailBooking, setDetailBooking] = useState(null);
  const [detailResourceImages, setDetailResourceImages] = useState([]);
  const [detailResourceLocation, setDetailResourceLocation] = useState("");
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [detailImageLoading, setDetailImageLoading] = useState(false);
  const [detailQrImage, setDetailQrImage] = useState("");
  const [detailQrLoading, setDetailQrLoading] = useState(false);
  const [detailQrError, setDetailQrError] = useState("");
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
  const bookingsView = location.pathname.endsWith("/history") ? "history" : "upcoming";
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
            return [id, resourcePrimaryImage(resource), String(resource?.availability || resource?.availabilityText || "").trim()];
          } catch {
            return [id, "", ""];
          }
        })
      );
      if (!cancelled) {
        setResourceImageById((prev) => {
          const next = { ...prev };
          for (const [id, image] of entries) next[id] = image;
          return next;
        });
        setResourceAvailabilityById((prev) => {
          const next = { ...prev };
          for (const [id, , availability] of entries) next[id] = availability;
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
      setDetailResourceImages([]);
      setDetailResourceLocation("");
      setDetailImageIndex(0);
      setDetailImageLoading(false);
      return;
    }
    let cancelled = false;
    setDetailImageLoading(true);
    void (async () => {
      try {
        const resource = await getResourceById(detailBooking.resourceId);
        const images = resourceImageUrls(resource);
        if (!cancelled) {
          setDetailResourceImages(images);
          setDetailResourceLocation(String(resource?.location || "").trim());
          setDetailImageIndex(0);
        }
      } catch {
        if (!cancelled) {
          setDetailResourceImages([]);
          setDetailResourceLocation("");
          setDetailImageIndex(0);
        }
      } finally {
        if (!cancelled) setDetailImageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailBooking?.resourceId]);

  useEffect(() => {
    if (!detailBooking?.id) {
      setDetailQrImage("");
      setDetailQrLoading(false);
      setDetailQrError("");
      return;
    }
    const status = String(detailBooking?.status || "").toUpperCase();
    if (status !== "APPROVED" && status !== "CHECKED_IN") {
      setDetailQrImage("");
      setDetailQrLoading(false);
      setDetailQrError("");
      return;
    }
    let cancelled = false;
    setDetailQrLoading(true);
    setDetailQrError("");
    void (async () => {
      try {
        const data = await getMyBookingQr(detailBooking.id);
        const qrValue = String(data?.data?.qrValue || "").trim();
        if (!qrValue) throw new Error("QR value unavailable");
        const url = await QRCode.toDataURL(qrValue, { width: 240, margin: 1 });
        if (!cancelled) setDetailQrImage(url);
      } catch (e) {
        if (!cancelled) {
          setDetailQrImage("");
          setDetailQrError(e?.message || "Could not load booking QR.");
        }
      } finally {
        if (!cancelled) setDetailQrLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailBooking?.id, detailBooking?.status]);

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
    setEditSelectedSlotKeys([]);
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

  const editAvailabilityWindow = useMemo(() => {
    const resourceId = String(editBookingTarget?.resourceId || "").trim();
    return parseAvailabilityWindow(resourceAvailabilityById[resourceId] || "");
  }, [editBookingTarget?.resourceId, resourceAvailabilityById]);

  useEffect(() => {
    const resourceId = String(editBookingTarget?.resourceId || "").trim();
    if (!resourceId) return;
    let cancelled = false;
    void (async () => {
      try {
        const resource = await getResourceById(resourceId);
        const latestAvailability = String(resource?.availability || resource?.availabilityText || "").trim();
        if (!cancelled) {
          setResourceAvailabilityById((prev) => ({ ...prev, [resourceId]: latestAvailability }));
        }
      } catch {
        // keep previously known value/fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editBookingTarget?.resourceId]);

  const editSlots = useMemo(() => {
    const startMin = toMinutes(editAvailabilityWindow.start);
    const endMin = toMinutes(editAvailabilityWindow.end);
    if (startMin == null || endMin == null || startMin >= endMin) return [];
    const slots = [];
    let cursor = startMin;
    while (cursor + EDIT_SLOT_DURATION_MINUTES <= endMin) {
      const startTime = toHHMM(cursor);
      const endTime = toHHMM(cursor + EDIT_SLOT_DURATION_MINUTES);
      slots.push({ key: `${startTime}-${endTime}`, startTime, endTime });
      cursor += EDIT_SLOT_DURATION_MINUTES;
    }
    return slots;
  }, [editAvailabilityWindow]);

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
    if (!editBookingTarget?.id || !editSlots.length) return;
    if (editSelectedSlotKeys.length > 0) return;
    const keys = deriveSlotKeysFromRange(editSlots, editBookingTarget.startTime, editBookingTarget.endTime);
    if (keys.length) setEditSelectedSlotKeys(keys);
  }, [editBookingTarget?.id, editBookingTarget?.startTime, editBookingTarget?.endTime, editSlots, editSelectedSlotKeys.length]);

  useEffect(() => {
    if (!editSelectedOrderedSlots.length) {
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
      const contiguous = areContiguousSlots(nextSlots, EDIT_SLOT_DURATION_MINUTES);
      if (!contiguous) {
        setEditBookingError("Please select only continuous time slots.");
        return prev;
      }
      return nextKeys;
    });
    setEditBookingError("");
  };

  const renderBookingCard = (booking) => (
    <article
      key={booking.id || `${booking.resourceId}-${booking.bookingDate}-${booking.startTime}`}
      style={{
        ...bookingCardStyle,
        border: "1px solid #F5E7C6",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "10px" }}>
        <h3 style={{ margin: "0 0 3px 0", fontSize: "17px", fontWeight: 800, color: "#111827" }}>{booking.resourceName || "Resource"}</h3>
        <span style={{ ...bookingChipStyle, ...bookingStatusChip(booking.status) }}>{booking.status || "PENDING"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 150px", gap: "12px 12px", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <div style={bookingFieldLabelStyle}>Resource Type</div>
            <div style={bookingFieldValueStyle}>{booking.resourceType || "—"}</div>
          </div>
          <div>
            <div style={bookingFieldLabelStyle}>Time Range</div>
            <div style={bookingFieldValueStyle}>{booking.startTime || "—"} - {booking.endTime || "—"}</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <div style={bookingFieldLabelStyle}>Date</div>
            <div style={bookingFieldValueStyle}>{formatBookingDate(booking.bookingDate)}</div>
          </div>
          <div>
            <div style={bookingFieldLabelStyle}>Status</div>
            <div style={bookingFieldValueStyle}>{booking.status || "PENDING"}</div>
          </div>
        </div>
        <div style={{ width: "150px", height: "96px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", justifySelf: "end" }}>
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

  const downloadQr = () => {
    if (!detailQrImage || !detailBooking?.id) return;
    const a = document.createElement("a");
    a.href = detailQrImage;
    a.download = `booking-qr-${detailBooking.id}.png`;
    a.click();
  };

  if (!getAuthToken()) return null;

  return (
    <AccountLayout active="bookings">
      <style>{`
        .bookings-filter-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          height: 40px;
          box-sizing: border-box;
          padding: 8px 38px 8px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background-color: #ffffff;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 18px 18px;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          color: #111827;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }
        .bookings-filter-select:hover {
          border-color: #fdba74;
        }
        .bookings-filter-select:focus {
          outline: none;
          border-color: #fdba74;
          box-shadow: none;
        }
        .bookings-filter-select option {
          font-weight: 500;
          padding: 10px 14px;
          background-color: #ffffff;
          color: #111827;
        }
        .bookings-filter-text,
        .bookings-filter-date {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          height: 40px;
          box-sizing: border-box;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background-color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          color: #111827;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }
        .bookings-filter-text::placeholder {
          color: #9ca3af;
          font-weight: 450;
        }
        .bookings-filter-date {
          cursor: pointer;
          color-scheme: light;
        }
        .bookings-filter-text:hover,
        .bookings-filter-date:hover {
          border-color: #fdba74;
        }
        .bookings-filter-text:focus,
        .bookings-filter-date:focus {
          outline: none;
          border-color: #fdba74;
          box-shadow: none;
        }
        .bookings-filter-reset {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #fdba74;
          background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
          color: #9a3412;
          font-weight: 700;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 2px rgba(251, 146, 60, 0.12);
        }
        .bookings-filter-reset:hover {
          background: linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%);
          border-color: #fb923c;
          color: #7c2d12;
        }
        .bookings-filter-reset:focus-visible {
          outline: none;
          border-color: #fb923c;
        }
      `}</style>
      <h1 style={{ ...sectionHeading, marginBottom: "22px" }}>{bookingsView === "history" ? "Booking history" : "Upcoming bookings"}</h1>
      {bookingsLoading && <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Loading bookings...</p></div>}
      {!bookingsLoading && bookingsError && <div style={cardStyle}><p style={{ margin: 0, color: "#b91c1c", fontSize: "15px", fontWeight: 700 }}>{bookingsError}</p></div>}
      {!bookingsLoading && !bookingsError && bookings.length === 0 && <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No bookings yet.</p></div>}
      {!bookingsLoading && !bookingsError && bookings.length > 0 && (
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 14px 16px", background: "#fff", marginBottom: 12, boxSizing: "border-box", overflow: "hidden" }}>
            <div style={filterBarGrid}>
              <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))} className="bookings-filter-select" aria-label="Filter by status">
                <option value="ALL">Status: All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} className="bookings-filter-date" aria-label="Filter by date" />
              <select value={filters.resourceType} onChange={(e) => setFilters((s) => ({ ...s, resourceType: e.target.value }))} className="bookings-filter-select" aria-label="Filter by resource type">
                {resourceTypes.map((t) => <option key={t} value={t}>{t === "ALL" ? "Resource Type: All" : t}</option>)}
              </select>
              <input value={filters.resource} onChange={(e) => setFilters((s) => ({ ...s, resource: e.target.value }))} className="bookings-filter-text" placeholder="Resource name/id" aria-label="Filter by resource name or id" />
              <select value={filters.approvalState} onChange={(e) => setFilters((s) => ({ ...s, approvalState: e.target.value }))} className="bookings-filter-select" aria-label="Filter by approval state">
                <option value="ALL">Approval State: All</option>
                <option value="UNREVIEWED">Unreviewed</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                className="bookings-filter-reset"
                onClick={() => setFilters({ status: "ALL", date: "", resourceType: "ALL", resource: "", approvalState: "ALL" })}
              >
                Reset
              </button>
            </div>
          </section>

          {bookingsView === "upcoming" && (
            filteredUpcomingBookings.length === 0 ? (
              <div style={{ ...cardStyle, padding: "16px 18px" }}><p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>No upcoming bookings.</p></div>
            ) : (
              <div style={bookingsGridStyle}>{filteredUpcomingBookings.map(renderBookingCard)}</div>
            )
          )}

          {bookingsView === "history" && (
            filteredHistoryBookings.length === 0 ? (
              <div style={{ ...cardStyle, padding: "16px 18px" }}><p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>No booking history yet.</p></div>
            ) : (
              <div style={bookingsGridStyle}>{filteredHistoryBookings.map(renderBookingCard)}</div>
            )
          )}
        </div>
      )}
      {detailBooking && (
        <div role="dialog" aria-modal="true" onClick={() => setDetailBooking(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1200 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "820px",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#fff",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)",
              padding: "18px 18px 14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2
                style={{
                  margin: 0,
                  color: "#14213D",
                  fontSize: "34px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                Booking Details
              </h2>
              <button type="button" onClick={() => setDetailBooking(null)} style={{ border: "1px solid #d1d5db", backgroundColor: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontWeight: 700, color: "#374151" }}>Close</button>
            </div>

            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", background: "#f8fafc" }}>
                <div style={{ width: "100%", minHeight: 180, maxHeight: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {detailImageLoading ? (
                    <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Loading image...</span>
                  ) : detailResourceImages[detailImageIndex] ? (
                    <img src={detailResourceImages[detailImageIndex]} alt="Resource" style={{ width: "100%", height: "100%", maxHeight: 340, objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>No image available</span>
                  )}
                </div>
                {detailResourceImages.length > 1 && (
                  <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e7eb", overflowX: "auto" }}>
                    {detailResourceImages.map((src, idx) => (
                      <button
                        key={`${src}-${idx}`}
                        type="button"
                        onClick={() => setDetailImageIndex(idx)}
                        style={{
                          width: 74,
                          height: 54,
                          padding: 0,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: idx === detailImageIndex ? "2px solid #FA8112" : "1px solid #cbd5e1",
                          background: "#fff",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        aria-label={`Show image ${idx + 1}`}
                        aria-current={idx === detailImageIndex ? "true" : undefined}
                      >
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px 14px" }}>
                <div>
                  <div style={bookingFieldLabelStyle}>Resource Name</div>
                  <div style={bookingFieldValueStyle}>{detailBooking.resourceName || "—"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Type</div>
                  <div style={bookingFieldValueStyle}>{detailBooking.resourceType || "—"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Date</div>
                  <div style={bookingFieldValueStyle}>{formatBookingDate(detailBooking.bookingDate)}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Location</div>
                  <div style={bookingFieldValueStyle}>{detailResourceLocation || detailBooking.resourceLocation || detailBooking.location || "—"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Status</div>
                  <div style={bookingFieldValueStyle}>{detailBooking.status || "PENDING"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Time Range</div>
                  <div style={bookingFieldValueStyle}>{detailBooking.startTime || "—"} - {detailBooking.endTime || "—"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Purpose</div>
                  <div style={bookingFieldValueStyle}>{detailBooking.purpose || "—"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>{cancellationOrRejectionLabel(detailBooking)}</div>
                  <div style={bookingFieldValueStyle}>{cancellationOrRejectionReason(detailBooking) || "—"}</div>
                </div>
                <div>
                  <div style={bookingFieldLabelStyle}>Total Duration</div>
                  <div style={bookingFieldValueStyle}>{durationHours(detailBooking.startTime, detailBooking.endTime)}</div>
                </div>
              </div>

              {(String(detailBooking?.status || "").toUpperCase() === "APPROVED" || String(detailBooking?.status || "").toUpperCase() === "CHECKED_IN") && (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff", padding: "10px", display: "grid", gap: 8, justifyItems: "center" }}>
                  <strong style={{ fontSize: 13, color: "#111827" }}>Booking QR</strong>
                  {detailQrLoading && <span style={{ color: "#64748b", fontSize: 12 }}>Loading QR...</span>}
                  {!detailQrLoading && detailQrImage && <img src={detailQrImage} alt="Booking QR" style={{ width: 140, height: 140, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 8 }} />}
                  {!detailQrLoading && !detailQrImage && <span style={{ color: "#64748b", fontSize: 12 }}>{detailQrError || "QR unavailable."}</span>}
                  <button type="button" disabled={!detailQrImage} onClick={downloadQr} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #d1d5db", background: detailQrImage ? "#fff" : "#f3f4f6", color: "#374151", fontWeight: 700, fontSize: "12px", cursor: detailQrImage ? "pointer" : "not-allowed" }}>
                    Download QR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {cancelBookingTarget && <div role="dialog" aria-modal="true" onClick={() => { if (cancelBusyId) return; setCancelBookingTarget(null); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1300 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "560px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}><h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>Cancel Booking</h3><p style={{ margin: "0 0 12px 0", color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>Are you sure you want to cancel this booking?</p><label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Cancellation reason</label><textarea value={cancelReasonDraft} onChange={(e) => { setCancelReasonDraft(e.target.value); setCancelReasonError(""); }} maxLength={500} rows={4} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }} placeholder="Please provide the reason for cancellation..." />{cancelReasonError && <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{cancelReasonError}</p>}<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}><button type="button" disabled={!!cancelBusyId} onClick={() => { setCancelBookingTarget(null); setCancelReasonDraft(""); setCancelReasonError(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: cancelBusyId ? "not-allowed" : "pointer" }}>Close</button><button type="button" disabled={cancelBusyId === cancelBookingTarget.id} onClick={() => handleCancelBooking(cancelBookingTarget)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: cancelBusyId === cancelBookingTarget.id ? "not-allowed" : "pointer" }}>{cancelBusyId === cancelBookingTarget.id ? "Cancelling..." : "Confirm Cancel"}</button></div></div></div>}
      {editBookingTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-booking-title"
          onClick={() => {
            if (editBusyId) return;
            setEditBookingTarget(null);
            setEditBookingError("");
          }}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1250 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "620px",
              maxHeight: "min(78vh, 600px)",
              backgroundColor: "#fff",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ flexShrink: 0, padding: "16px 18px 12px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 id="edit-booking-title" style={{ ...sectionHeading, margin: 0 }}>
                Edit Booking
              </h2>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "14px 18px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={editBookingDraft.bookingDate}
                    onChange={(e) => {
                      setEditBookingDraft((d) => ({ ...d, bookingDate: e.target.value }));
                      setEditSelectedSlotKeys([]);
                    }}
                    style={inputEditable}
                  />
                </div>
                <div />
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input type="time" value={editBookingDraft.startTime} readOnly disabled style={inputDisabled} />
                </div>
                <div>
                  <label style={labelStyle}>End Time</label>
                  <input type="time" value={editBookingDraft.endTime} readOnly disabled style={inputDisabled} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Available Time Slots</label>
                  {editSlotsLoading && <p style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Loading available slots...</p>}
                  {!editSlotsLoading && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 8,
                        maxHeight: "min(200px, 28vh)",
                        overflowY: "auto",
                        padding: "2px",
                      }}
                    >
                      {editSlots.map((slot) => {
                        const booked = !!editSlotStateMap[slot.key];
                        const selected = editSelectedSlotKeys.includes(slot.key);
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            disabled={booked}
                            onClick={() => handleEditSlotClick(slot)}
                            style={{
                              height: 36,
                              borderRadius: 8,
                              border: selected ? "2px solid #0369a1" : "1px solid #d1d5db",
                              background: booked ? "#e5e7eb" : selected ? "#e0f2fe" : "#fff",
                              color: booked ? "#6b7280" : selected ? "#0c4a6e" : "#111827",
                              fontWeight: 700,
                              fontSize: "12px",
                              cursor: booked ? "not-allowed" : "pointer",
                            }}
                          >
                            {prettySlot(slot.startTime, slot.endTime)} {booked ? "• Booked" : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                    Select one or more continuous slots. Start/End time will be combined automatically.
                  </p>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Purpose</label>
                  <textarea
                    rows={2}
                    value={editBookingDraft.purpose}
                    onChange={(e) => setEditBookingDraft((d) => ({ ...d, purpose: e.target.value }))}
                    style={{ ...inputEditable, height: "auto", minHeight: "72px", resize: "vertical" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Expected Attendees</label>
                  <input
                    value={editBookingDraft.expectedAttendees}
                    onChange={(e) => setEditBookingDraft((d) => ({ ...d, expectedAttendees: e.target.value.replace(/[^\d]/g, "") }))}
                    style={inputEditable}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Additional Notes</label>
                  <textarea
                    rows={2}
                    value={editBookingDraft.additionalNotes}
                    onChange={(e) => setEditBookingDraft((d) => ({ ...d, additionalNotes: e.target.value }))}
                    style={{ ...inputEditable, height: "auto", minHeight: "72px", resize: "vertical" }}
                  />
                </div>
              </div>
            </div>
            {editBookingError && (
              <div style={{ flexShrink: 0, padding: "0 18px 8px" }}>
                <p style={{ margin: 0, color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{editBookingError}</p>
              </div>
            )}
            <div
              style={{
                flexShrink: 0,
                padding: "12px 18px 16px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                disabled={!!editBusyId}
                onClick={() => {
                  setEditBookingTarget(null);
                  setEditBookingError("");
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 700,
                  cursor: editBusyId ? "not-allowed" : "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                disabled={editBusyId === editBookingTarget.id}
                onClick={handleUpdateBooking}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#FA8112",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: editBusyId === editBookingTarget.id ? "not-allowed" : "pointer",
                }}
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
