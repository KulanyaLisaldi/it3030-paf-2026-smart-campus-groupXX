import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTechnician } from "../api/adminTechnicians";
import { DEFAULT_TECHNICIAN_CATEGORY, TECHNICIAN_CATEGORIES } from "../constants/technicianCategories";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(180deg, #FAF3E1 0%, #FFFFFF 70%)",
  padding: "28px 16px",
  display: "flex",
  justifyContent: "center",
};

const containerStyle = {
  width: "100%",
  maxWidth: "720px",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.08)",
  padding: "28px",
};

const selectStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "8px",
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem("smartCampusUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function TechnicianWorkspace() {
  const navigate = useNavigate();
  const raw = localStorage.getItem("smartCampusUser");
  let name = "Technician";
  try {
    const u = raw ? JSON.parse(raw) : null;
    if (u?.firstName) name = u.firstName;
  } catch {
    /* ignore */
  }

  const handleLogout = () => {
    localStorage.removeItem("smartCampusUser");
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/signin", { replace: true });
  };

  return (
    <>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 800, color: "#222222" }}>Technician workspace</h1>
      <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>
        Welcome back, {name}. Ticket assignment and maintenance workflows can plug in here.
      </p>
      <button
        type="button"
        onClick={handleLogout}
        style={{
          padding: "10px 18px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#222222",
          color: "#FFFFFF",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </>
  );
}

function AdminTechnicianForm() {
  const navigate = useNavigate();
  const [techFirstName, setTechFirstName] = useState("");
  const [techLastName, setTechLastName] = useState("");
  const [techEmail, setTechEmail] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [techCategory, setTechCategory] = useState(DEFAULT_TECHNICIAN_CATEGORY);
  const [techPassword, setTechPassword] = useState("");
  const [techSubmitting, setTechSubmitting] = useState(false);
  const [techMessage, setTechMessage] = useState("");
  const [techError, setTechError] = useState("");

  const submitAddTechnician = async (e) => {
    e.preventDefault();
    setTechMessage("");
    setTechError("");
    setTechSubmitting(true);
    try {
      await createTechnician({
        firstName: techFirstName.trim(),
        lastName: techLastName.trim(),
        email: techEmail.trim(),
        phoneNumber: techPhone.trim(),
        password: techPassword,
        category: techCategory,
      });
      setTechMessage("Technician created. They can sign in with email and password.");
      setTechFirstName("");
      setTechLastName("");
      setTechEmail("");
      setTechPhone("");
      setTechCategory(DEFAULT_TECHNICIAN_CATEGORY);
      setTechPassword("");
    } catch (err) {
      setTechError(err?.message || "Could not create technician.");
    } finally {
      setTechSubmitting(false);
    }
  };

  return (
    <>
      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "12px",
          backgroundColor: "#FAF3E1",
          marginBottom: "18px",
        }}
      >
        <div style={{ color: "#222222", fontSize: "22px", fontWeight: 800, lineHeight: 1.1 }}>Welcome back, Admin</div>
        <div style={{ color: "#6b7280", fontSize: "13px", fontWeight: 600, marginTop: "6px" }}>
          Ticket analytics dashboard with live operational metrics
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/adminticket")}
        style={{
          marginBottom: "16px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #F5E7C6",
          backgroundColor: "#FFFFFF",
          color: "#14213D",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        ← Back to Admin Ticket Dashboard
      </button>

      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "14px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div style={sectionTitleStyle}>Technicians</div>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>
          Create staff accounts. Technicians sign in with email and password on the main Sign In page.
        </p>
        <form onSubmit={submitAddTechnician} style={{ display: "grid", gap: "10px", maxWidth: "480px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input
              required
              placeholder="First name"
              value={techFirstName}
              onChange={(e) => setTechFirstName(e.target.value)}
              style={selectStyle}
            />
            <input
              required
              placeholder="Last name"
              value={techLastName}
              onChange={(e) => setTechLastName(e.target.value)}
              style={selectStyle}
            />
          </div>
          <input
            required
            type="email"
            placeholder="Work email"
            value={techEmail}
            onChange={(e) => setTechEmail(e.target.value)}
            style={selectStyle}
          />
          <input
            placeholder="Phone (optional)"
            value={techPhone}
            onChange={(e) => setTechPhone(e.target.value)}
            style={selectStyle}
          />
          <select
            required
            value={techCategory}
            onChange={(e) => setTechCategory(e.target.value)}
            style={selectStyle}
            aria-label="Technician category"
          >
            {TECHNICIAN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            required
            type="password"
            minLength={6}
            placeholder="Initial password (min 6 characters)"
            value={techPassword}
            onChange={(e) => setTechPassword(e.target.value)}
            style={selectStyle}
          />
          <button
            type="submit"
            disabled={techSubmitting}
            style={{ ...buttonStyle, opacity: techSubmitting ? 0.85 : 1, width: "fit-content" }}
          >
            {techSubmitting ? "Saving…" : "Add technician"}
          </button>
        </form>
        {techMessage ? (
          <p style={{ margin: "10px 0 0 0", color: "#2e7d32", fontSize: "13px", fontWeight: 600 }}>{techMessage}</p>
        ) : null}
        {techError ? <p style={{ margin: "10px 0 0 0", color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{techError}</p> : null}
      </div>
    </>
  );
}

export default function TechnicianDashboard() {
  const user = useMemo(() => getStoredUser(), []);
  const isTechnician = (user?.role || "").toUpperCase() === "TECHNICIAN";

  return (
    <div style={pageStyle}>
      <section style={containerStyle}>{isTechnician ? <TechnicianWorkspace /> : <AdminTechnicianForm />}</section>
    </div>
  );
}
