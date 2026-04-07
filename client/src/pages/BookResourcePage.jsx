import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { getResources } from "../api/resources";
import { createBooking, getBookedSlots } from "../api/bookings";

const pageStyle = { maxWidth: 980, margin: "0 auto", padding: "28px 20px 40px", boxSizing: "border-box" };
const panelStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 26px rgba(15,23,42,0.06)", padding: 18 };
const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const inputStyle = { width: "100%", height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid #dbe4ee", boxSizing: "border-box", outline: "none", background: "#fff", color: "#0f172a", fontSize: 14 };
const textareaStyle = { ...inputStyle, height: 108, padding: "12px", resize: "vertical" };
const buttonStyle = { height: 42, borderRadius: 10, padding: "0 14px", border: "none", fontWeight: 800, cursor: "pointer" };
const SLOT_DURATION_HOURS = 2;
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

export default function BookResourcePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedResourceId = (searchParams.get("resourceId") || "").trim();

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
    load();
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

  const allSlots = useMemo(() => {
    const startMin = toMinutes(availabilityWindow.start);
    const endMin = toMinutes(availabilityWindow.end);
    if (startMin == null || endMin == null || startMin >= endMin) return [];
    const slots = [];
    let cursor = startMin;
    while (cursor + SLOT_DURATION_HOURS * 60 <= endMin) {
      const startTime = toHHMM(cursor);
      const endTime = toHHMM(cursor + SLOT_DURATION_HOURS * 60);
      slots.push({ key: `${startTime}-${endTime}`, startTime, endTime });
      cursor += SLOT_DURATION_HOURS * 60;
    }
    return slots;
  }, [availabilityWindow]);

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
      const isBooked = bookedRanges.some((r) => {
        const bStart = toMinutes(r.startTime);
        const bEnd = toMinutes(r.endTime);
        if (slotStart == null || slotEnd == null || bStart == null || bEnd == null) return false;
        return slotStart < bEnd && slotEnd > bStart;
      });
      booked[slot.key] = isBooked;
    }
    return booked;
  }, [allSlots, bookedRanges]);

  const selectedOrderedSlots = useMemo(() => {
    const selected = allSlots.filter((s) => selectedSlotKeys.includes(s.key));
    return selected.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [allSlots, selectedSlotKeys]);
  const selectedStartTime = selectedOrderedSlots.length > 0 ? selectedOrderedSlots[0].startTime : "";
  const selectedEndTime = selectedOrderedSlots.length > 0 ? selectedOrderedSlots[selectedOrderedSlots.length - 1].endTime : "";
  const selectedDurationHours = selectedSlotKeys.length * SLOT_DURATION_HOURS;

  useEffect(() => {
    setSubmitState({ busy: false, success: "", error: "" });
  }, [form.resourceId, form.bookingDate, form.purpose, form.expectedAttendees, form.additionalNotes, selectedSlotKeys]);

  const handleSlotClick = (slot) => {
    if (slotStateMap[slot.key]) return;
    setSelectedSlotKeys((prev) => (prev.includes(slot.key) ? prev.filter((k) => k !== slot.key) : [...prev, slot.key]));
  };

  const handleSubmit = async () => {
    if (!form.resourceId || !form.bookingDate || !selectedStartTime || !selectedEndTime || !form.purpose.trim()) {
      setSubmitState({ busy: false, success: "", error: "Please complete all required fields." });
      return;
    }
    if (attendeesApplicable && form.expectedAttendees === "") {
      setSubmitState({ busy: false, success: "", error: "Expected attendees is required for this resource." });
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
      setSubmitState({ busy: false, success: "Booking request submitted successfully. Current status: PENDING.", error: "" });
      setForm((s) => ({ ...s, purpose: "", expectedAttendees: "", additionalNotes: "" }));
      setSelectedSlotKeys([]);
      setBookedRanges((prev) => [...prev, { startTime: selectedStartTime, endTime: selectedEndTime }]);
    } catch (e) {
      setSubmitState({ busy: false, success: "", error: e?.message || "Could not submit booking request." });
    }
  };

  const handleReset = () => {
    setForm({
      resourceId: isResourceLocked ? preselectedResourceId : "",
      bookingDate: "",
      purpose: "",
      expectedAttendees: "",
      additionalNotes: "",
    });
    setSelectedSlotKeys([]);
    setBookedRanges([]);
    setSubmitState({ busy: false, success: "", error: "" });
  };

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={pageStyle}>
        <h1 style={{ margin: 0, color: "#14213D", fontSize: 30, fontWeight: 900 }}>Book a Resource</h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, maxWidth: 760 }}>
          Fill in booking details and select one or more available time slots. Booking requests are submitted with Pending status.
        </p>

        <section style={{ ...panelStyle, marginTop: 16 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Section 1 - Resource Details</h2>
          {loadingResources && <p style={{ margin: "0 0 10px", color: "#64748b", fontWeight: 700 }}>Loading resources...</p>}
          {!loadingResources && loadError && <p style={{ margin: "0 0 10px", color: "#b91c1c", fontWeight: 700 }}>{loadError}</p>}

          <div style={gridStyle}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>{isResourceLocked ? "Selected Resource" : "Select Resource"}</label>
              {isResourceLocked ? (
                <input
                  style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }}
                  value={`${selectedResource.name || selectedResource.code || "Resource"} (${selectedResource.type || "UNKNOWN"})`}
                  readOnly
                  disabled
                />
              ) : (
                <select style={inputStyle} value={form.resourceId} onChange={(e) => setForm((s) => ({ ...s, resourceId: e.target.value }))} disabled={loadingResources}>
                  <option value="">Select a resource</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {`${r.name || r.code || "Resource"} (${r.type || "UNKNOWN"})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Resource Type</label>
              <input style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }} value={selectedResource?.type || "—"} readOnly disabled />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Location</label>
              <input style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }} value={selectedResource?.location || "—"} readOnly disabled />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Capacity</label>
              <input style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }} value={selectedResource?.capacity ?? "—"} readOnly disabled />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Availability Window</label>
              <input style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }} value={`${availabilityWindow.start} - ${availabilityWindow.end}`} readOnly disabled />
            </div>
          </div>
        </section>

        <section style={{ ...panelStyle, marginTop: 14 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Section 2 - Booking Details</h2>
          <div style={gridStyle}>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Booking Date</label>
              <input type="date" style={inputStyle} value={form.bookingDate} onChange={(e) => setForm((s) => ({ ...s, bookingDate: e.target.value }))} />
            </div>
            <div />

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>
                Time Slots ({availabilityWindow.start} - {availabilityWindow.end})
              </label>
              <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#475569", fontWeight: 600 }}>Select one or more available time slots</p>

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
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isBooked && !isSelected) e.currentTarget.style.background = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          if (!isBooked && !isSelected) e.currentTarget.style.background = "#ffffff";
                        }}
                      >
                        {prettySlot(slot.startTime, slot.endTime)} {isBooked ? "• Booked" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
              {!slotsLoading && allSlots.length > 0 && allSlots.every((s) => slotStateMap[s.key]) && (
                <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontWeight: 700 }}>No slots available</p>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Purpose</label>
              <textarea style={textareaStyle} value={form.purpose} onChange={(e) => setForm((s) => ({ ...s, purpose: e.target.value }))} placeholder="Enter the purpose of booking" />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Expected Attendees</label>
              <input
                style={inputStyle}
                value={form.expectedAttendees}
                onChange={(e) => setForm((s) => ({ ...s, expectedAttendees: e.target.value.replace(/[^\d]/g, "") }))}
                placeholder={attendeesApplicable ? "Enter number of attendees" : "Not required for equipment"}
                disabled={!attendeesApplicable}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Additional Notes (optional)</label>
              <textarea style={textareaStyle} value={form.additionalNotes} onChange={(e) => setForm((s) => ({ ...s, additionalNotes: e.target.value }))} placeholder="Any extra information..." />
            </div>
          </div>
        </section>

        <section style={{ ...panelStyle, marginTop: 14 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 19, color: "#0f172a", fontWeight: 900 }}>Section 3 - Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, color: "#334155", fontWeight: 600 }}>
            <div><strong>Selected resource:</strong> {selectedResource?.name || selectedResource?.code || "—"}</div>
            <div><strong>Selected date:</strong> {form.bookingDate || "—"}</div>
            <div><strong>Selected slots:</strong> {selectedSlotKeys.length > 0 ? selectedOrderedSlots.map((s) => prettySlot(s.startTime, s.endTime)).join(", ") : "—"}</div>
            <div><strong>Total duration:</strong> {selectedDurationHours > 0 ? `${selectedDurationHours} hours` : "—"}</div>
            <div><strong>Status after submit:</strong> PENDING</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#FA8112", color: "#fff", opacity: submitState.busy ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={submitState.busy}
            >
              {submitState.busy ? "Submitting..." : "Submit Booking"}
            </button>
            <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={handleReset}>
              Reset
            </button>
          </div>

          {submitState.error && <p style={{ margin: "10px 0 0", color: "#b91c1c", fontWeight: 800 }}>{submitState.error}</p>}
          {submitState.success && <p style={{ margin: "10px 0 0", color: "#15803d", fontWeight: 800 }}>{submitState.success}</p>}
        </section>
      </div>
    </main>
  );
}
