import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTechnician } from "../api/adminTechnicians";
import { getAuthToken } from "../api/http";
import { persistCampusUser, readCampusUser } from "../utils/campusUserStorage";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(165deg, #FAF3E1 0%, #ffffff 55%)",
  display: "flex",
  flexDirection: "column",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  padding: "16px 24px",
  backgroundColor: "#14213D",
  color: "#f8fafc",
  flexWrap: "wrap",
};

const mainStyle = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "32px 20px 48px",
  boxSizing: "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: "520px",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 20px 50px rgba(20, 33, 61, 0.1)",
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

const ghostBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(248, 250, 252, 0.25)",
  background: "transparent",
  color: "#e2e8f0",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

export default function AdminTechnicianDashboard() {
  const navigate = useNavigate();
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

  const handleSubmit = async (e) => {
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

  return (
    <div style={pageStyle}>
      <header style={topBarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
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
            <div style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "-0.02em" }}>Admin dashboard</div>
            <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>Smart Campus · Technicians</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" style={ghostBtn} onClick={() => navigate("/")}>
            Campus home
          </button>
          <button type="button" style={ghostBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main style={mainStyle}>
        <div style={cardStyle}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 800, color: "#14213D" }}>Add technician</h1>
          <p style={{ margin: "0 0 24px 0", fontSize: "14px", lineHeight: 1.55, color: "#6b7280" }}>
            Create an account for support staff. They will use the campus <strong>Sign In</strong> page with the email and
            password you set here.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
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
              <label style={labelStyle}>Phone <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span></label>
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
      </main>
    </div>
  );
}
