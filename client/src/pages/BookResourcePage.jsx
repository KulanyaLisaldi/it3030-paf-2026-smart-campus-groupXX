import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { getResources } from "../api/resources";
import { createBooking, getBookedSlots } from "../api/bookings";

const pageStyle = { maxWidth: 1220, margin: "0 auto", padding: "24px 18px 40px", boxSizing: "border-box" };
const twoColStyle = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "start" };
const panelStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 26px rgba(15,23,42,0.06)", padding: 18 };
const inputStyle = { width: "100%", height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid #dbe4ee", boxSizing: "border-box", outline: "none", background: "#fff", color: "#0f172a", fontSize: 14 };
const textareaStyle = { ...inputStyle, height: 108, padding: "12px", resize: "vertical" };
const buttonStyle = {
  height: 42,
  minWidth: 84,
  borderRadius: 10,
  padding: "0 12px",
  border: "none",
  fontWeight: 600,
  fontSize: 16,
  cursor: "pointer",
};

const SLOT_DURATION_HOURS = 1;
const DEFAULT_WINDOW_START = "08:00";
const DEFAULT_WINDOW_END = "18:00";

function normalizeResources(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.resources)) return payload.resources;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function prettySlot(start, end) {
  return `${start} - ${end}`;
}

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

function parseAvailabilityWindow(raw) {
  const text = String(raw || "").trim();
  const timeTokens = text.match(/\d{1,2}[:.]\d{2}\s*(?:am|pm)?/gi) || [];
  if (timeTokens.length < 2) return { start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
  const startToken = timeTokens[0];
  const endToken = timeTokens[1];
  const startMin = parseClockToken(startToken);
  let endMin = parseClockToken(endToken);
  if (endMin === 0 && /am/i.test(endToken)) endMin = 24 * 60;
  if (startMin == null || endMin == null || startMin >= endMin) return { start: DEFAULT_WINDOW_START, end: DEFAULT_WINDOW_END };
  return { start: toHHMM(startMin), end: toHHMM(endMin) };
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value || value.startsWith("blob:")) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return `/${value.replace(/^\.?\/*/, "")}`;
}

function resourceImageUrls(resource) {
  if (!resource || typeof resource !== "object") return [];
  const raw = [];
  if (Array.isArray(resource.imageUrls)) raw.push(...resource.imageUrls);
  if (resource.imageUrl) raw.push(resource.imageUrl);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const normalized = normalizeImageUrl(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export default function BookResourcePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedResourceId = (searchParams.get("resourceId") || "").trim();
  const [isCompactLayout, setIsCompactLayout] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 1100 : false));

  const [currentStep, setCurrentStep] = useState(0);
  const [loadingResources, setLoadingResources] = useState(true);
  const [resources, setResources] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
    resourceId: preselectedResourceId,
    bookingDate: "",
    purpose: "",
    expectedAttendees: "",
    additionalNotes: "",
  });
  const [submitState, setSubmitState] = useState({ busy: false, success: "", error: "" });
  const [bookedRanges, setBookedRanges] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [mainImageBroken, setMainImageBroken] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsCompactLayout(window.innerWidth < 1100);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!getAuthToken()) navigate("/signin", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      setLoadingResources(true);
      setLoadError("");
      try {
        const data = await getResources({ status: "ACTIVE" });
        setResources(normalizeResources(data));
      } catch (e) {
        setResources([]);
        setLoadError(e?.message || "Could not load resources.");
      } finally {
        setLoadingResources(false);
      }
    };
    void load();
  }, []);

  const selectedResource = useMemo(
    () => resources.find((r) => String(r.id || "") === String(form.resourceId || "")) || null,
    [resources, form.resourceId]
  );
  const isResourceLocked = !!preselectedResourceId && !!selectedResource && String(selectedResource.id || "") === preselectedResourceId;
  const resourceType = String(selectedResource?.type || "").toUpperCase();
  const attendeesApplicable = resourceType && resourceType !== "EQUIPMENT";
  const availabilityWindow = useMemo(
    () => parseAvailabilityWindow(selectedResource?.availability || selectedResource?.availabilityText),
    [selectedResource]
  );
  const resourceImages = useMemo(() => resourceImageUrls(selectedResource), [selectedResource]);
  const selectedImage = resourceImages[imageIndex] || "";

  useEffect(() => {
    setImageIndex(0);
    setMainImageBroken(false);
  }, [selectedResource?.id, form.resourceId]);

  const allSlots = useMemo(() => {
    const startMin = toMinutes(availabilityWindow.start);
    const endMin = toMinutes(availabilityWindow.end);
    if (startMin == null || endMin == null || startMin >= endMin) return [];
    const isToday = form.bookingDate === todayIsoDate();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const effectiveStartMin = isToday ? Math.max(startMin, currentMinutes) : startMin;
    const slots = [];
    let cursor = effectiveStartMin;
    const slotDurationMinutes = SLOT_DURATION_HOURS * 60;
    // Align to the resource-window grid (not to absolute clock hour).
    // Example: 08:30-10:30 with 1h slots => 08:30-09:30, 09:30-10:30.
    const offsetFromWindowStart = (cursor - startMin) % slotDurationMinutes;
    if (offsetFromWindowStart !== 0) cursor += slotDurationMinutes - offsetFromWindowStart;
    while (cursor + SLOT_DURATION_HOURS * 60 <= endMin) {
      const startTime = toHHMM(cursor);
      const endTime = toHHMM(cursor + SLOT_DURATION_HOURS * 60);
      slots.push({ key: `${startTime}-${endTime}`, startTime, endTime });
      cursor += SLOT_DURATION_HOURS * 60;
    }
    return slots;
  }, [availabilityWindow, form.bookingDate]);

  useEffect(() => {
    if (!form.resourceId || !form.bookingDate) {
      setBookedRanges([]);
      setSelectedSlotKeys([]);
      return;
    }
    const loadSlots = async () => {
      setSlotsLoading(true);
      try {
        const data = await getBookedSlots({ resourceId: form.resourceId, bookingDate: form.bookingDate });
        setBookedRanges(Array.isArray(data?.bookedSlots) ? data.bookedSlots : []);
      } catch {
        setBookedRanges([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    void loadSlots();
  }, [form.resourceId, form.bookingDate]);

  const slotStateMap = useMemo(() => {
    const booked = {};
    for (const slot of allSlots) {
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);
      booked[slot.key] = bookedRanges.some((r) => {
        const bStart = toMinutes(r.startTime);
        const bEnd = toMinutes(r.endTime);
        if (slotStart == null || slotEnd == null || bStart == null || bEnd == null) return false;
        return slotStart < bEnd && slotEnd > bStart;
      });
    }
    return booked;
  }, [allSlots, bookedRanges]);

  const selectedOrderedSlots = useMemo(() => {
    const selected = allSlots.filter((s) => selectedSlotKeys.includes(s.key));
    return selected.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [allSlots, selectedSlotKeys]);
  const selectedStartTime = selectedOrderedSlots.length ? selectedOrderedSlots[0].startTime : "";
  const selectedEndTime = selectedOrderedSlots.length ? selectedOrderedSlots[selectedOrderedSlots.length - 1].endTime : "";
  const selectedDurationHours = selectedSlotKeys.length * SLOT_DURATION_HOURS;

  useEffect(() => {
    setSubmitState({ busy: false, success: "", error: "" });
  }, [form.resourceId, form.bookingDate, form.purpose, form.expectedAttendees, form.additionalNotes, selectedSlotKeys]);

  const handleSlotClick = (slot) => {
    if (slotStateMap[slot.key]) return;
    setSelectedSlotKeys((prev) => {
      const nextKeys = prev.includes(slot.key) ? prev.filter((k) => k !== slot.key) : [...prev, slot.key];
      const nextSlots = allSlots.filter((s) => nextKeys.includes(s.key));
      const contiguous = areContiguousSlots(nextSlots, SLOT_DURATION_HOURS * 60);
      if (!contiguous) {
        setSubmitState({ busy: false, success: "", error: "Please select only continuous time slots." });
        return prev;
      }
      return nextKeys;
    });
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!form.resourceId) return "Please select a resource.";
    }
    if (step === 1) {
      if (!form.bookingDate) return "Please choose booking date.";
      if (!selectedSlotKeys.length) return "Please select at least one available time slot.";
    }
    if (step === 1) {
      if (!form.purpose.trim()) return "Purpose is required.";
      if (attendeesApplicable && form.expectedAttendees === "") return "Expected attendees is required for this resource.";
      if (attendeesApplicable && selectedResource?.capacity != null && Number(form.expectedAttendees || 0) > Number(selectedResource.capacity)) {
        return "Expected attendees cannot exceed capacity.";
      }
    }
    return "";
  };

  const nextStep = () => {
    const err = validateStep(currentStep);
    if (err) {
      setSubmitState({ busy: false, success: "", error: err });
      return;
    }
    setSubmitState({ busy: false, success: "", error: "" });
    setCurrentStep((s) => Math.min(2, s + 1));
  };

  const previousStep = () => {
    setSubmitState((s) => ({ ...s, error: "" }));
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = async () => {
    const err = validateStep(1);
    if (err || !selectedStartTime || !selectedEndTime) {
      setSubmitState({ busy: false, success: "", error: err || "Please complete all required fields." });
      return;
    }
    setSubmitState({ busy: true, success: "", error: "" });
    try {
      await createBooking({
        resourceId: form.resourceId,
        bookingDate: form.bookingDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        purpose: form.purpose.trim(),
        expectedAttendees: attendeesApplicable && form.expectedAttendees !== "" ? Number(form.expectedAttendees) : null,
        additionalNotes: form.additionalNotes.trim(),
      });
      setSubmitState({ busy: false, success: "Booking request submitted successfully.", error: "" });
      setCurrentStep(3);
    } catch (e) {
      setSubmitState({ busy: false, success: "", error: e?.message || "Could not submit booking request." });
    }
  };

  const stepPills = ["Resource", "Date & Time + Details", "Confirmation"];
  const timeSlotsSummary = selectedSlotKeys.length ? selectedOrderedSlots.map((s) => prettySlot(s.startTime, s.endTime)).join(", ") : "-";

  const summaryCard = (
    <aside
      style={{
        ...panelStyle,
        position: isCompactLayout ? "static" : "sticky",
        top: isCompactLayout ? 0 : 16,
        alignSelf: "start",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.02em", color: "#14213D" }}>Reservation Summary</h3>
      <div style={{ marginTop: 12, display: "grid", gap: 10, color: "#334155", fontSize: 13 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div><strong>Resource Name:</strong> {selectedResource?.name || selectedResource?.code || "-"}</div>
          <div><strong>Type:</strong> {selectedResource?.type || "-"}</div>
          <div><strong>Location:</strong> {selectedResource?.location || "-"}</div>
          <div><strong>Capacity:</strong> {selectedResource?.capacity ?? "-"}</div>
        </div>
        <div style={{ height: 1, background: "#e2e8f0" }} />
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Booking Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <div><strong>Booking Date:</strong> {form.bookingDate || "-"}</div>
            <div><strong>Time Slots:</strong> {timeSlotsSummary}</div>
            <div><strong>Duration:</strong> {selectedDurationHours ? `${selectedDurationHours} hour(s)` : "-"}</div>
            <div><strong>Status:</strong> {currentStep === 3 ? "Pending" : "-"}</div>
          </div>
        </div>
        {currentStep >= 2 && (
          <>
            <div style={{ height: 1, background: "#e2e8f0" }} />
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Request Notes</div>
              <div><strong>Purpose:</strong> {form.purpose.trim() || "-"}</div>
              <div><strong>Attendees:</strong> {attendeesApplicable ? (form.expectedAttendees || "-") : "-"}</div>
            </div>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={pageStyle}>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "center",
            width: isCompactLayout ? "100%" : "1016px",
            maxWidth: "100%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, overflowX: "auto", paddingBottom: 2, maxWidth: "100%" }}>
            {stepPills.map((step, idx) => {
              const done = currentStep > idx || currentStep === 3;
              const active = currentStep === idx;
              const nodeBg = done ? "#22c55e" : active ? "#FA8112" : "#e2e8f0";
              const nodeFg = done || active ? "#ffffff" : "#475569";
              const textColor = done ? "#15803d" : active ? "#14213D" : "#64748b";
              const connectorColor = done ? "#22c55e" : "#cbd5e1";
              return (
                <React.Fragment key={step}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: nodeBg,
                        color: nodeFg,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                      aria-hidden
                    >
                      {done ? "✓" : idx + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textColor, whiteSpace: "nowrap" }}>{step}</span>
                  </div>
                  {idx < stepPills.length - 1 && (
                    <span
                      aria-hidden
                      style={{
                        height: 2,
                        width: 44,
                        margin: "0 10px",
                        borderRadius: 999,
                        background: connectorColor,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            ...twoColStyle,
            gridTemplateColumns: isCompactLayout ? "1fr" : "680px 320px",
            gap: isCompactLayout ? 14 : 16,
            justifyContent: isCompactLayout ? "stretch" : "center",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
          <section style={panelStyle}>
            {loadingResources && <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>Loading resources...</p>}
            {!loadingResources && loadError && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{loadError}</p>}

            {!loadingResources && currentStep === 0 && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div
                      style={{
                        width: "100%",
                        minHeight: 180,
                        maxHeight: 340,
                        display: mainImageBroken || !selectedImage ? "flex" : "block",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!mainImageBroken && selectedImage ? (
                        <img
                          src={selectedImage}
                          alt={`${selectedResource?.name || "Resource"} preview`}
                          style={{ width: "100%", height: "100%", maxHeight: 340, objectFit: "cover", display: "block" }}
                          onError={() => setMainImageBroken(true)}
                        />
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700, padding: 16 }}>No image</span>
                      )}
                    </div>
                    {resourceImages.length > 1 && (
                      <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e2e8f0", overflowX: "auto" }}>
                        {resourceImages.map((src, idx) => (
                          <button
                            key={`${src}-${idx}`}
                            type="button"
                            onClick={() => {
                              setImageIndex(idx);
                              setMainImageBroken(false);
                            }}
                            style={{
                              padding: 0,
                              width: 74,
                              height: 54,
                              borderRadius: 8,
                              overflow: "hidden",
                              border: idx === imageIndex ? "2px solid #FA8112" : "1px solid #cbd5e1",
                              background: "#fff",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                            aria-label={`Show image ${idx + 1}`}
                            aria-current={idx === imageIndex ? "true" : undefined}
                          >
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: "16px 10px" }}>
                    {!isResourceLocked && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <select style={inputStyle} value={form.resourceId} onChange={(e) => setForm((s) => ({ ...s, resourceId: e.target.value }))} disabled={loadingResources}>
                          <option value="">Select a resource</option>
                          {resources.map((r) => <option key={r.id} value={r.id}>{`${r.name || r.code || "Resource"} (${r.type || "UNKNOWN"})`}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Resource Name</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.name || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Type</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.type || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Capacity</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.capacity ?? "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Location</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.location || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Status</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.status || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Availability Window</div>
                      <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>
                        {selectedResource?.availability || selectedResource?.availabilityText || `${availabilityWindow.start} - ${availabilityWindow.end}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: isCompactLayout ? "stretch" : "flex-end" }}>
                  <button
                    type="button"
                    style={{ ...buttonStyle, background: "#FA8112", color: "#fff", width: isCompactLayout ? "100%" : "auto" }}
                    onClick={nextStep}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {!loadingResources && currentStep === 1 && (
              <>
                <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#14213D", fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.02em" }}>Date & Time + Details</h2>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Booking Date</label>
                  <input type="date" min={todayIsoDate()} style={inputStyle} value={form.bookingDate} onChange={(e) => setForm((s) => ({ ...s, bookingDate: e.target.value }))} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>
                    Time Slots ({availabilityWindow.start} - {availabilityWindow.end})
                  </label>
                  {slotsLoading && <p style={{ margin: "0 0 8px 0", color: "#64748b", fontWeight: 700 }}>Loading booked slots...</p>}
                  {!slotsLoading && allSlots.length === 0 && <p style={{ margin: "0 0 8px 0", color: "#b91c1c", fontWeight: 700 }}>No time slots configured for this resource.</p>}
                  {!slotsLoading && allSlots.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {allSlots.map((slot) => {
                        const isBooked = !!slotStateMap[slot.key];
                        const isSelected = selectedSlotKeys.includes(slot.key);
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            onClick={() => handleSlotClick(slot)}
                            disabled={isBooked}
                            title={isBooked ? "Booked slot" : "Click to select slot"}
                            style={{
                              height: 42,
                              borderRadius: 10,
                              border: isSelected ? "2px solid #0369a1" : "1px solid #cbd5e1",
                              background: isBooked ? "#e5e7eb" : isSelected ? "#e0f2fe" : "#ffffff",
                              color: isBooked ? "#6b7280" : isSelected ? "#0c4a6e" : "#0f172a",
                              fontWeight: 600,
                              cursor: isBooked ? "not-allowed" : "pointer",
                            }}
                          >
                            {prettySlot(slot.startTime, slot.endTime)} {isBooked ? "• Booked" : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Purpose</label>
                  <textarea style={textareaStyle} value={form.purpose} onChange={(e) => setForm((s) => ({ ...s, purpose: e.target.value }))} placeholder="Enter booking purpose" />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Expected Attendees</label>
                  <input
                    style={inputStyle}
                    value={form.expectedAttendees}
                    onChange={(e) => setForm((s) => ({ ...s, expectedAttendees: e.target.value.replace(/[^\d]/g, "") }))}
                    placeholder={attendeesApplicable ? "Enter number of attendees" : "Not required for equipment"}
                    disabled={!attendeesApplicable}
                  />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Additional Notes</label>
                  <textarea style={textareaStyle} value={form.additionalNotes} onChange={(e) => setForm((s) => ({ ...s, additionalNotes: e.target.value }))} placeholder="Any additional notes..." />
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={previousStep}>Back</button>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }} onClick={nextStep}>Next</button>
                </div>
              </>
            )}

            {!loadingResources && currentStep === 2 && (
              <>
                <h2 style={{ margin: "0 0 10px 0", fontSize: 19, color: "#14213D", fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.02em" }}>Confirmation</h2>
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 10, padding: "10px 12px", fontWeight: 700 }}>
                  Review your booking before submitting
                </div>
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isCompactLayout ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))", gap: "16px 14px" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Resource Name</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.name || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Type</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.type || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Date</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{form.bookingDate || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Location</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedResource?.location || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Time Slots</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>
                      {selectedSlotKeys.length ? selectedOrderedSlots.map((s) => prettySlot(s.startTime, s.endTime)).join(", ") : "-"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Duration</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{selectedDurationHours ? `${selectedDurationHours} hours` : "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Purpose</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{form.purpose || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Attendees</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{attendeesApplicable ? (form.expectedAttendees || "-") : "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Notes</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 600, color: "#14213D" }}>{form.additionalNotes || "-"}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={previousStep}>Back</button>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff", opacity: submitState.busy ? 0.7 : 1 }} onClick={handleSubmit} disabled={submitState.busy}>
                    {submitState.busy ? "Submitting..." : "Submit Booking"}
                  </button>
                </div>
              </>
            )}

            {!loadingResources && currentStep === 3 && (
              <>
                <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#14213D", fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.02em" }}>Booking Submitted</h2>
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 10, padding: "12px 14px", fontWeight: 700 }}>
                  Your booking request has been submitted
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={() => navigate("/account/bookings")}>View My Bookings</button>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }} onClick={() => navigate("/resources")}>Make Another Booking</button>
                </div>
              </>
            )}

            {submitState.error && (
              <p
                style={{
                  margin: "12px 0 0",
                  color: "#b91c1c",
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.45,
                  letterSpacing: "-0.01em",
                }}
              >
                {submitState.error}
              </p>
            )}
            {submitState.success && currentStep !== 3 && (
              <p
                style={{
                  margin: "12px 0 0",
                  color: "#15803d",
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.45,
                  letterSpacing: "-0.01em",
                }}
              >
                {submitState.success}
              </p>
            )}
          </section>
          </div>

          {summaryCard}
        </div>
      </div>
    </main>
  );
}
