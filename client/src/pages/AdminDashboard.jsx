import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTechnician } from "../api/adminTechnicians";
import { getAuthToken } from "../api/http";
import { persistCampusUser, readCampusUser } from "../utils/campusUserStorage";

const shellStyle = {
  minHeight: "100vh",
  display: "flex",
  backgroundColor: "#f1f5f9",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const sidebarStyle = {
  width: "272px",
  minWidth: "272px",
  background: "linear-gradient(180deg, #14213D 0%, #1a2d4d 100%)",
  color: "#e2e8f0",
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  boxSizing: "border-box",
  borderRight: "1px solid rgba(148, 163, 184, 0.12)",
};

const mainStyle = {
  flex: 1,
  overflow: "auto",
  padding: "32px 28px 40px",
  boxSizing: "border-box",
};

const sectionLabelStyle = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#94a3b8",
  padding: "0 16px",
  marginTop: "20px",
  marginBottom: "8px",
};

const cardStyle = {
  maxWidth: "560px",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
  padding: "28px 28px 32px",
  boxSizing: "border-box",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "2px solid #F5E7C6",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "#FFFFFF",
  color: "#222222",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 700,
  color: "#374151",
  marginBottom: "6px",
};

const primaryBtn = {
  padding: "14px 22px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
};

function navRowStyle(active) {
  return {
    width: "100%",
    textAlign: "left",
    padding: "11px 16px",
    margin: "2px 8px",
    borderRadius: "10px",
    border: "none",
    background: active ? "rgba(250, 129, 18, 0.2)" : "transparent",
    color: active ? "#fb923c" : "#cbd5e1",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxSizing: "border-box",
    borderLeft: active ? "3px solid #FA8112" : "3px solid transparent",
  };
}

function subNavStyle(active) {
  return {
    width: "calc(100% - 16px)",
    marginLeft: "16px",
    marginRight: "8px",
    textAlign: "left",
    padding: "9px 14px 9px 22px",
    borderRadius: "8px",
    border: "none",
    background: active ? "rgba(255,255,255,0.08)" : "transparent",
    color: active ? "#f8fafc" : "#94a3b8",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  };
}

const PLACEHOLDER_STYLE = {
  maxWidth: "560px",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1",
  padding: "40px 28px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.55,
  boxSizing: "border-box",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState("add-technician");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAuthToken();
    const user = readCampusUser();
    if (!token || !user || user.role !== "ADMIN") {
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    persistCampusUser(null);
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/", { replace: true });
  };

  const handleSubmitTechnician = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);
    try {
      await createTechnician({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
      });
      setMessage("Technician created. They can sign in with email and password on the main Sign In page.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
    } catch (err) {
      setError(err?.message || "Could not create technician.");
    } finally {
      setSubmitting(false);
    }
  };

  const user = readCampusUser();
  if (!getAuthToken() || !user || user.role !== "ADMIN") {
    return null;
  }

  const pageTitle =
    panel === "add-technician"
      ? "User management · Add technician"
      : panel === "tickets"
        ? "Ticket management"
        : "Booking management";

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        <div style={{ padding: "22px 18px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #FA8112, #F5E7C6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: "18px",
              }}
            >
              A
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#f8fafc" }}>Admin</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>Smart Campus</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "4px 0" }} aria-label="Admin sections">
          <div style={sectionLabelStyle}>USER MANAGEMENT</div>
          <button
            type="button"
            style={subNavStyle(panel === "add-technician")}
            onClick={() => setPanel("add-technician")}
          >
            Add technician
          </button>

          <div style={sectionLabelStyle}>OPERATIONS</div>
          <button type="button" style={navRowStyle(panel === "tickets")} onClick={() => setPanel("tickets")}>
            Ticket management
          </button>
          <button type="button" style={navRowStyle(panel === "bookings")} onClick={() => setPanel("bookings")}>
            Booking management
          </button>
        </nav>

        <div style={{ padding: "12px 14px 20px", borderTop: "1px solid rgba(148, 163, 184, 0.15)" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              width: "100%",
              padding: "10px 14px",
              marginBottom: "8px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            ← Campus home
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              background: "rgba(127, 29, 29, 0.35)",
              color: "#fecaca",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <main style={mainStyle}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>{pageTitle}</h1>
        <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>
          {panel === "add-technician" &&
            "Create technician accounts for your support team. They sign in on the main Sign In page with the credentials you set."}
          {panel === "tickets" && "Review and manage support tickets. More tools will be added here."}
          {panel === "bookings" && "Manage campus bookings and reservations. This section is coming soon."}
        </p>

        {panel === "add-technician" && (
          <div style={cardStyle}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: 700, color: "#222222" }}>New technician</h2>
            <form onSubmit={handleSubmitTechnician} style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>First name</label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last name</label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={inputStyle}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Work email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="name@campus.edu"
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Phone <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={inputStyle}
                  placeholder="+94 77 000 0000"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label style={labelStyle}>Initial password</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 600 }} role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p style={{ margin: 0, color: "#15803d", fontSize: "14px", fontWeight: 600 }} role="status">
                  {message}
                </p>
              )}

              <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.85 : 1 }}>
                {submitting ? "Creating…" : "Create technician"}
              </button>
            </form>
          </div>
        )}

        {panel === "tickets" && (
          <div style={PLACEHOLDER_STYLE}>Ticket management tools will appear here in a future update.</div>
        )}

        {panel === "bookings" && (
          <div style={PLACEHOLDER_STYLE}>No booking tools yet. This area is reserved for future campus booking management.</div>
        )}
      </main>
    </div>
  );
}
