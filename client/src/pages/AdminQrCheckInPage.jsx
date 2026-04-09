import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import { appFontFamily } from "../utils/appFont";
import { confirmBookingCheckIn, validateBookingCheckIn } from "../api/bookings";

const panelStyle = { backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #FFDDB8", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", padding: "14px" };
const buttonStyle = { height: 38, borderRadius: 9, border: "none", padding: "0 12px", fontWeight: 700, cursor: "pointer" };
const inputStyle = { width: "100%", height: 40, borderRadius: 10, border: "1px solid #FFDDB8", padding: "0 10px", boxSizing: "border-box", fontSize: 14 };

function parseQr(raw) {
  const value = String(raw || "").trim();
  if (!value) return { bookingId: "", qrValue: "" };
  const parts = value.split(":");
  if (parts.length === 3 && parts[0].toUpperCase() === "BOOKING") return { bookingId: parts[1], qrValue: value };
  return { bookingId: value, qrValue: value };
}

export default function AdminQrCheckInPage() {
  const scannerRef = useRef(null);
  const scanningRef = useRef(false);
  const lastScannedRef = useRef("");
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [validateBusy, setValidateBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [manualBookingId, setManualBookingId] = useState("");
  const [verification, setVerification] = useState(null);
  const [verifyPayload, setVerifyPayload] = useState({ bookingId: "", qrValue: "" });
  const isAlreadyCheckedIn =
    String(verification?.checkInStatus || "").toUpperCase() === "CHECKED_IN" ||
    String(verification?.bookingStatus || "").toUpperCase() === "CHECKED_IN";

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    try {
      if (scanningRef.current) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.clear();
    } catch {
      // ignore scanner stop errors
    } finally {
      scanningRef.current = false;
      setScannerBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const runValidation = async (payload) => {
    setValidateBusy(true);
    setScannerError("");
    try {
      const response = await validateBookingCheckIn(payload);
      setVerification(response?.data || null);
      setVerifyPayload(payload);
    } catch (e) {
      setVerification(null);
      setScannerError(e?.message || "Verification failed.");
    } finally {
      setValidateBusy(false);
    }
  };

  const startScanner = async () => {
    if (scannerBusy) return;
    setScannerError("");
    setScannerBusy(true);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("booking-qr-reader");
      }
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const trimmed = String(decodedText || "").trim();
          if (!trimmed || trimmed === lastScannedRef.current) return;
          lastScannedRef.current = trimmed;
          const payload = parseQr(trimmed);
          void runValidation(payload);
          void stopScanner();
        },
        () => {}
      );
      scanningRef.current = true;
    } catch (e) {
      setScannerError(e?.message || "Could not start scanner. Check camera permission.");
      setScannerBusy(false);
      scanningRef.current = false;
    }
  };

  const rescan = async () => {
    lastScannedRef.current = "";
    await stopScanner();
    await startScanner();
  };

  const verifyManual = async () => {
    const bookingId = manualBookingId.trim();
    if (!bookingId) {
      setScannerError("Enter a booking ID.");
      return;
    }
    await runValidation({ bookingId, qrValue: "" });
  };

  const confirmCheckIn = async () => {
    if (!verification?.valid) return;
    setConfirmBusy(true);
    setScannerError("");
    try {
      const response = await confirmBookingCheckIn(verifyPayload);
      setVerification(response?.data || null);
    } catch (e) {
      setScannerError(e?.message || "Could not confirm check-in.");
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <AdminLayout activeSection="bookings" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>QR Check-In</h1>
        <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>
          Scan approved booking QR, validate booking, and confirm check-in.
        </p>
        <section style={panelStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid #FFDDB8", borderRadius: 12, padding: 12 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "#0f172a" }}>Booking QR Verification</h3>
            <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 14 }}>
              Use laptop/desktop webcam to scan booking QR code.
            </p>
            <div id="booking-qr-reader" style={{ width: "100%", minHeight: 260, borderRadius: 10, border: "1px dashed #FFDDB8", background: "#f8fafc" }} />
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => void startScanner()} style={{ ...buttonStyle, background: "#16a34a", color: "#fff" }}>Start Scanner</button>
              <button type="button" onClick={() => void stopScanner()} style={{ ...buttonStyle, background: "#334155", color: "#fff" }}>Stop Scanner</button>
              <button type="button" onClick={() => void rescan()} style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }}>Rescan</button>
            </div>
          </div>

          <div style={{ border: "1px solid #FFDDB8", borderRadius: 12, padding: 12, display: "grid", gap: 10, alignContent: "start" }}>
            <div style={{ border: "1px solid #FFDDB8", borderRadius: 10, padding: 10, background: "#fff" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Verification Result</h4>
              <p style={{ margin: 0, color: verification?.valid ? "#166534" : "#64748b", fontWeight: 700 }}>
                {verification ? verification.message : "Scan QR or verify booking ID manually."}
              </p>
            </div>
            <div style={{ border: "1px solid #FFDDB8", borderRadius: 10, padding: 10, background: "#fff" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Booking Details</h4>
              {!verification && <p style={{ margin: 0, color: "#64748b" }}>No booking loaded.</p>}
              {verification && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: 13, color: "#334155" }}>
                  <div><strong>Booking ID:</strong> {verification.bookingId || "—"}</div>
                  <div><strong>User:</strong> {verification.userName || "—"}</div>
                  <div><strong>Email:</strong> {verification.userEmail || "—"}</div>
                  <div><strong>Resource:</strong> {verification.resourceName || "—"}</div>
                  <div><strong>Date:</strong> {verification.bookingDate || "—"}</div>
                  <div><strong>Time:</strong> {verification.startTime || "—"} - {verification.endTime || "—"}</div>
                  <div><strong>Status:</strong> {verification.bookingStatus || "—"}</div>
                  <div><strong>Check-In:</strong> {verification.checkInStatus || "—"}</div>
                  <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {verification.purpose || "—"}</div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={!verification?.valid || confirmBusy || isAlreadyCheckedIn}
                onClick={() => void confirmCheckIn()}
                style={{
                  ...buttonStyle,
                  background: isAlreadyCheckedIn ? "#16a34a" : verification?.valid ? "#16a34a" : "#94a3b8",
                  color: "#fff",
                  cursor: !verification?.valid || confirmBusy || isAlreadyCheckedIn ? "not-allowed" : "pointer",
                }}
              >
                {confirmBusy ? "Confirming..." : isAlreadyCheckedIn ? "Checked-In" : "Confirm Check-In"}
              </button>
              <button type="button" onClick={() => { setVerification(null); setScannerError(""); setVerifyPayload({ bookingId: "", qrValue: "" }); }} style={{ ...buttonStyle, background: "#fff", border: "1px solid #FFDDB8", color: "#0f172a" }}>
                Clear Result
              </button>
            </div>
          </div>
        </div>

        <section style={{ marginTop: 12, border: "1px solid #FFDDB8", borderRadius: 12, padding: 12, background: "#fff" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Manual Verification</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input value={manualBookingId} onChange={(e) => setManualBookingId(e.target.value)} placeholder="Enter booking ID" style={inputStyle} />
            <button type="button" onClick={() => void verifyManual()} disabled={validateBusy} style={{ ...buttonStyle, background: "#14213D", color: "#fff" }}>
              {validateBusy ? "Verifying..." : "Verify"}
            </button>
          </div>
          {scannerError && <p style={{ margin: "8px 0 0", color: "#b91c1c", fontWeight: 700 }}>{scannerError}</p>}
        </section>
      </section>
      </div>
    </AdminLayout>
  );
}
