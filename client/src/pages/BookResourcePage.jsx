import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { getResources } from "../api/resources";
import { checkBookingAvailability, createBooking } from "../api/bookings";

const pageStyle = { maxWidth: 980, margin: "0 auto", padding: "28px 20px 40px", boxSizing: "border-box" };
const panelStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 26px rgba(15,23,42,0.06)", padding: 18 };
const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const inputStyle = { width: "100%", height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid #dbe4ee", boxSizing: "border-box", outline: "none", background: "#fff", color: "#0f172a", fontSize: 14 };
const textareaStyle = { ...inputStyle, height: 108, padding: "12px", resize: "vertical" };
const buttonStyle = { height: 42, borderRadius: 10, padding: "0 14px", border: "none", fontWeight: 800, cursor: "pointer" };

function normalizeResources(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.resources)) return payload.resources;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
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
    startTime: "",
    endTime: "",
    purpose: "",
    expectedAttendees: "",
    additionalNotes: "",
  });
  const [availabilityState, setAvailabilityState] = useState({ checking: false, checked: false, available: false, message: "" });
  const [submitState, setSubmitState] = useState({ busy: false, success: "", error: "" });

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/signin", { replace: true });
    }
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

  const canCheckAvailability = !!form.resourceId && !!form.bookingDate && !!form.startTime && !!form.endTime;

  useEffect(() => {
    setAvailabilityState((s) => ({ ...s, checked: false, available: false, message: "" }));
    setSubmitState({ busy: false, success: "", error: "" });
  }, [form.resourceId, form.bookingDate, form.startTime, form.endTime, form.purpose, form.expectedAttendees, form.additionalNotes]);

  useEffect(() => {
    if (!canCheckAvailability) return;
    const t = setTimeout(() => {
      void runAvailabilityCheck();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.resourceId, form.bookingDate, form.startTime, form.endTime]);

  const runAvailabilityCheck = async () => {
    if (!canCheckAvailability) {
      setAvailabilityState({ checking: false, checked: false, available: false, message: "Select resource, date, start time, and end time first." });
      return;
    }
    setAvailabilityState({ checking: true, checked: false, available: false, message: "" });
    try {
      const response = await checkBookingAvailability({
        resourceId: form.resourceId,
        bookingDate: form.bookingDate,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      const available = !!response?.available;
      const message = response?.message || (available ? "Resource is available for the selected time" : "This resource is already booked for the selected time");
      setAvailabilityState({ checking: false, checked: true, available, message });
    } catch (e) {
      setAvailabilityState({ checking: false, checked: true, available: false, message: e?.message || "Could not check availability." });
    }
  };

  const handleSubmit = async () => {
    if (!availabilityState.checked || !availabilityState.available) {
      setSubmitState({ busy: false, success: "", error: "Please check availability and choose a free time slot before submitting." });
      return;
    }
    if (!form.resourceId || !form.bookingDate || !form.startTime || !form.endTime || !form.purpose.trim()) {
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
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose.trim(),
        expectedAttendees: attendeesApplicable && form.expectedAttendees !== "" ? Number(form.expectedAttendees) : null,
        additionalNotes: form.additionalNotes.trim(),
      });
      setSubmitState({ busy: false, success: "Booking request submitted successfully. Current status: PENDING.", error: "" });
      setForm((s) => ({ ...s, purpose: "", expectedAttendees: "", additionalNotes: "" }));
    } catch (e) {
      setSubmitState({ busy: false, success: "", error: e?.message || "Could not submit booking request." });
    }
  };

  const handleReset = () => {
    setForm({
      resourceId: isResourceLocked ? preselectedResourceId : "",
      bookingDate: "",
      startTime: "",
      endTime: "",
      purpose: "",
      expectedAttendees: "",
      additionalNotes: "",
    });
    setAvailabilityState({ checking: false, checked: false, available: false, message: "" });
    setSubmitState({ busy: false, success: "", error: "" });
  };

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={pageStyle}>
        <h1 style={{ margin: 0, color: "#14213D", fontSize: 30, fontWeight: 900 }}>Book a Resource</h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, maxWidth: 760 }}>
          Request a booking by selecting a resource, date, and time range. The system checks overlap conflicts before submission.
        </p>

        <div style={{ ...panelStyle, marginTop: 16 }}>
          {loadingResources && <p style={{ margin: "0 0 10px", color: "#64748b", fontWeight: 700 }}>Loading resources...</p>}
          {!loadingResources && loadError && <p style={{ margin: "0 0 10px", color: "#b91c1c", fontWeight: 700 }}>{loadError}</p>}

          <div style={gridStyle}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>
                {isResourceLocked ? "Selected Resource" : "Select Resource"}
              </label>
              {isResourceLocked ? (
                <input
                  style={{ ...inputStyle, background: "#f8fafc", color: "#475569" }}
                  value={`${selectedResource.name || selectedResource.code || "Resource"} (${selectedResource.type || "UNKNOWN"})`}
                  readOnly
                  disabled
                />
              ) : (
                <select
                  style={inputStyle}
                  value={form.resourceId}
                  onChange={(e) => setForm((s) => ({ ...s, resourceId: e.target.value }))}
                  disabled={loadingResources}
                >
                  <option value="">Select a resource</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {`${r.name || r.code || "Resource"} (${r.type || "UNKNOWN"})`}
                    </option>
                  ))}
                </select>
              )}
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Available categories include Lecture hall, Lab, Meeting room, and Equipment.
              </p>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Booking Date</label>
              <input type="date" style={inputStyle} value={form.bookingDate} onChange={(e) => setForm((s) => ({ ...s, bookingDate: e.target.value }))} />
            </div>
            <div />
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Start Time</label>
              <input type="time" style={inputStyle} value={form.startTime} onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>End Time</label>
              <input type="time" style={inputStyle} value={form.endTime} onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Purpose / Reason</label>
              <input style={inputStyle} value={form.purpose} onChange={(e) => setForm((s) => ({ ...s, purpose: e.target.value }))} placeholder="Enter the reason for booking" />
            </div>

            {attendeesApplicable && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Expected Attendees</label>
                <input
                  style={inputStyle}
                  value={form.expectedAttendees}
                  onChange={(e) => setForm((s) => ({ ...s, expectedAttendees: e.target.value.replace(/[^\d]/g, "") }))}
                  placeholder="Enter number of attendees"
                />
              </div>
            )}

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 700 }}>Additional Notes (optional)</label>
              <textarea style={textareaStyle} value={form.additionalNotes} onChange={(e) => setForm((s) => ({ ...s, additionalNotes: e.target.value }))} placeholder="Any extra information..." />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#0ea5e9", color: "#fff" }}
              onClick={runAvailabilityCheck}
              disabled={availabilityState.checking}
            >
              {availabilityState.checking ? "Checking..." : "Check Availability"}
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#FA8112", color: "#fff", opacity: submitState.busy ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={submitState.busy}
            >
              {submitState.busy ? "Submitting..." : "Submit Booking Request"}
            </button>
            <button type="button" style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #dbe4ee" }} onClick={handleReset}>
              Reset
            </button>
          </div>

          {availabilityState.checked && (
            <p style={{ margin: "12px 0 0", fontWeight: 800, color: availabilityState.available ? "#15803d" : "#b91c1c" }}>
              {availabilityState.message}
            </p>
          )}
          {submitState.error && <p style={{ margin: "10px 0 0", color: "#b91c1c", fontWeight: 800 }}>{submitState.error}</p>}
          {submitState.success && <p style={{ margin: "10px 0 0", color: "#15803d", fontWeight: 800 }}>{submitState.success}</p>}
        </div>
      </div>
    </main>
  );
}
