import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { getResources } from "../api/resources";
import { createBooking, getBookedSlots } from "../api/bookings";

const pageStyle = { maxWidth: 1180, margin: "0 auto", padding: "24px 18px 40px", boxSizing: "border-box" };
const twoColStyle = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "start" };
const panelStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 26px rgba(15,23,42,0.06)", padding: 18 };
const summaryPanelStyle = { ...panelStyle, position: "sticky", top: 16 };
const inputStyle = { width: "100%", height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid #dbe4ee", boxSizing: "border-box", outline: "none", background: "#fff", color: "#0f172a", fontSize: 14 };
const textareaStyle = { ...inputStyle, height: 108, padding: "12px", resize: "vertical" };
const buttonStyle = { height: 42, borderRadius: 10, padding: "0 14px", border: "none", fontWeight: 800, cursor: "pointer" };

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

function resourcePrimaryImage(resource) {
  if (!resource || typeof resource !== "object") return "";
  const candidates = [];
  if (Array.isArray(resource.imageUrls)) candidates.push(...resource.imageUrls);
  if (resource.imageUrl) candidates.push(resource.imageUrl);
  for (const c of candidates) {
    const n = normalizeImageUrl(c);
    if (n) return n;
  }
  return "";
}

export default function BookResourcePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedResourceId = (searchParams.get("resourceId") || "").trim();

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
  const resourceImage = useMemo(() => resourcePrimaryImage(selectedResource), [selectedResource]);

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

  const summaryCard = (
    <aside style={summaryPanelStyle}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Booking Summary</h3>
      <div style={{ marginTop: 12, display: "grid", gap: 8, color: "#334155", fontSize: 14 }}>
        <div><strong>Resource Name:</strong> {selectedResource?.name || selectedResource?.code || "-"}</div>
        <div><strong>Type:</strong> {selectedResource?.type || "-"}</div>
        <div><strong>Location:</strong> {selectedResource?.location || "-"}</div>
        <div><strong>Capacity:</strong> {selectedResource?.capacity ?? "-"}</div>
        <div><strong>Booking Date:</strong> {form.bookingDate || "-"}</div>
        <div><strong>Time Slots:</strong> {selectedSlotKeys.length ? selectedOrderedSlots.map((s) => prettySlot(s.startTime, s.endTime)).join(", ") : "-"}</div>
        <div><strong>Duration:</strong> {selectedDurationHours ? `${selectedDurationHours} hours` : "-"}</div>
        <div><strong>Status:</strong> {currentStep === 3 ? "Pending" : "-"}</div>
        {currentStep >= 2 && <div><strong>Purpose:</strong> {form.purpose.trim() || "-"}</div>}
        {currentStep >= 2 && <div><strong>Attendees:</strong> {attendeesApplicable ? (form.expectedAttendees || "-") : "-"}</div>}
      </div>
    </aside>
  );

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={pageStyle}>
        <h1 style={{ margin: 0, color: "#14213D", fontSize: 30, fontWeight: 900 }}>Book a Resource</h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>Complete your booking in 4 steps and submit for approval.</p>

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {stepPills.map((step, idx) => {
            const done = currentStep > idx || currentStep === 3;
            const active = currentStep === idx;
            return (
              <span key={step} style={{ padding: "6px 10px", borderRadius: 999, border: active ? "1px solid #0369a1" : "1px solid #d1d5db", background: done ? "#dcfce7" : active ? "#e0f2fe" : "#fff", color: done ? "#166534" : active ? "#0c4a6e" : "#475569", fontWeight: 800, fontSize: 12 }}>
                {idx + 1}. {step}
              </span>
            );
          })}
        </div>

        <div style={{ marginTop: 14, ...twoColStyle }}>
          <section style={panelStyle}>
            {loadingResources && <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>Loading resources...</p>}
            {!loadingResources && loadError && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{loadError}</p>}

            {!loadingResources && currentStep === 0 && (
              <>
                <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Selected Resource</h2>
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 14 }}>
                  <div style={{ height: 136, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {resourceImage ? <img src={resourceImage} alt="Resource" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>No image</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>{isResourceLocked ? "Selected Resource" : "Select Resource"}</label>
                      {isResourceLocked ? (
                        <input style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }} value={`${selectedResource?.name || selectedResource?.code || "Resource"} (${selectedResource?.type || "UNKNOWN"})`} readOnly disabled />
                      ) : (
                        <select style={inputStyle} value={form.resourceId} onChange={(e) => setForm((s) => ({ ...s, resourceId: e.target.value }))} disabled={loadingResources}>
                          <option value="">Select a resource</option>
                          {resources.map((r) => <option key={r.id} value={r.id}>{`${r.name || r.code || "Resource"} (${r.type || "UNKNOWN"})`}</option>)}
                        </select>
                      )}
                    </div>
                    <div><strong>Resource Name:</strong> {selectedResource?.name || "-"}</div>
                    <div><strong>Resource Code:</strong> {selectedResource?.code || "-"}</div>
                    <div><strong>Type:</strong> {selectedResource?.type || "-"}</div>
                    <div><strong>Capacity:</strong> {selectedResource?.capacity ?? "-"}</div>
                    <div><strong>Location:</strong> {selectedResource?.location || "-"}</div>
                    <div><strong>Status:</strong> {selectedResource?.status || "-"}</div>
                    <div style={{ gridColumn: "1 / -1" }}><strong>Availability Window:</strong> {selectedResource?.availability || selectedResource?.availabilityText || `${availabilityWindow.start} - ${availabilityWindow.end}`}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }} onClick={nextStep}>Next {"->"}</button>
                </div>
              </>
            )}

            {!loadingResources && currentStep === 1 && (
              <>
                <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Date & Time + Details</h2>
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
                              fontWeight: 800,
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
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={previousStep}>Back {"<-"}</button>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }} onClick={nextStep}>Next {"->"}</button>
                </div>
              </>
            )}

            {!loadingResources && currentStep === 2 && (
              <>
                <h2 style={{ margin: "0 0 10px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Confirmation</h2>
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 10, padding: "10px 12px", fontWeight: 700 }}>
                  Review your booking before submitting
                </div>
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", color: "#334155", fontSize: 14 }}>
                  <div><strong>Resource Name:</strong> {selectedResource?.name || "-"}</div>
                  <div><strong>Type:</strong> {selectedResource?.type || "-"}</div>
                  <div><strong>Location:</strong> {selectedResource?.location || "-"}</div>
                  <div><strong>Date:</strong> {form.bookingDate || "-"}</div>
                  <div><strong>Time Slots:</strong> {selectedSlotKeys.length ? selectedOrderedSlots.map((s) => prettySlot(s.startTime, s.endTime)).join(", ") : "-"}</div>
                  <div><strong>Duration:</strong> {selectedDurationHours ? `${selectedDurationHours} hours` : "-"}</div>
                  <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {form.purpose || "-"}</div>
                  <div><strong>Attendees:</strong> {attendeesApplicable ? (form.expectedAttendees || "-") : "-"}</div>
                  <div><strong>Notes:</strong> {form.additionalNotes || "-"}</div>
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={previousStep}>Back {"<-"}</button>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff", opacity: submitState.busy ? 0.7 : 1 }} onClick={handleSubmit} disabled={submitState.busy}>
                    {submitState.busy ? "Submitting..." : "Submit Booking"}
                  </button>
                </div>
              </>
            )}

            {!loadingResources && currentStep === 3 && (
              <>
                <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Booking Submitted</h2>
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 10, padding: "12px 14px", fontWeight: 700 }}>
                  Your booking request has been submitted
                </div>
                <div style={{ marginTop: 12, border: "1px dashed #cbd5e1", borderRadius: 10, padding: "14px", color: "#64748b", fontWeight: 600 }}>
                  Booking QR placeholder (to be added later)
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={() => navigate("/account/bookings")}>View My Bookings</button>
                  <button type="button" style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }} onClick={() => navigate("/resources")}>Make Another Booking</button>
                </div>
              </>
            )}

            {submitState.error && <p style={{ margin: "12px 0 0", color: "#b91c1c", fontWeight: 800 }}>{submitState.error}</p>}
            {submitState.success && currentStep !== 3 && <p style={{ margin: "12px 0 0", color: "#15803d", fontWeight: 800 }}>{submitState.success}</p>}
          </section>

          {summaryCard}
        </div>
      </div>
    </main>
  );
}
