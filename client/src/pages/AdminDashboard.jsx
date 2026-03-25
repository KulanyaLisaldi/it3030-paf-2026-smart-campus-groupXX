import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTechnician } from "../api/adminTechnicians";
import { getAuthToken } from "../api/http";
import { DEFAULT_TECHNICIAN_CATEGORY, TECHNICIAN_CATEGORIES } from "../constants/technicianCategories";
import { ACCOUNT_PATH } from "../utils/authRedirect";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../utils/campusUserStorage";

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

const mainColumnStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  minWidth: 0,
};

const topBarStyle = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "16px",
  padding: "14px 24px",
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
  boxSizing: "border-box",
};

const mainScrollStyle = {
  flex: 1,
  overflow: "auto",
  padding: "28px 28px 40px",
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

const selectFieldStyle = {
  ...inputStyle,
  cursor: "pointer",
  minHeight: "46px",
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

function displayName(user) {
  if (!user) return "Admin";
  const first = (user.firstName || "").trim();
  const last = (user.lastName || "").trim();
  if (first || last) return `${first} ${last}`.trim();
  return user.fullName?.trim() || user.email || "Admin";
}

function profileInitial(user) {
  if (!user) return "?";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "A";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState("add-technician");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userRev, setUserRev] = useState(0);
  const profileRef = useRef(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [category, setCategory] = useState(DEFAULT_TECHNICIAN_CATEGORY);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const adminUser = useMemo(() => readCampusUser(), [userRev]);

  useEffect(() => {
    const token = getAuthToken();
    const user = readCampusUser();
    if (!token || !user || user.role !== "ADMIN") {
      navigate("/signin", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const onUserUpdated = () => setUserRev((n) => n + 1);
    window.addEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
    return () => window.removeEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
  }, []);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (profileRef.current && !profileRef.current.contains(t)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

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
        category,
      });
      setMessage("Technician created. They can sign in with email and password on the main Sign In page.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneNumber("");
      setCategory(DEFAULT_TECHNICIAN_CATEGORY);
      setPassword("");
    } catch (err) {
      setError(err?.message || "Could not create technician.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!getAuthToken() || !adminUser || adminUser.role !== "ADMIN") {
    return null;
  }

  const pageTitle =
    panel === "add-technician"
      ? "User management · Add technician"
      : panel === "tickets"
        ? "Ticket management"
        : "Booking management";

  const avatarSize = 40;
  const triggerStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: "50%",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: adminUser.profileImageUrl ? "#fff" : "#475569",
    color: "#fff",
    fontWeight: 700,
    fontSize: "16px",
    overflow: "hidden",
    boxShadow: profileMenuOpen ? "0 0 0 2px #FA8112" : "0 0 0 1px #e2e8f0",
  };

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

      <div style={mainColumnStyle}>
        <header style={topBarStyle}>
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              style={triggerStyle}
              onClick={() => setProfileMenuOpen((o) => !o)}
            >
              {adminUser.profileImageUrl ? (
                <img
                  src={adminUser.profileImageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                profileInitial(adminUser)
              )}
            </button>
            {profileMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  width: "min(280px, calc(100vw - 48px))",
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
                  padding: "16px",
                  zIndex: 50,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: adminUser.profileImageUrl ? "#f1f5f9" : "#475569",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "18px",
                      overflow: "hidden",
                    }}
                  >
                    {adminUser.profileImageUrl ? (
                      <img
                        src={adminUser.profileImageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      profileInitial(adminUser)
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>{displayName(adminUser)}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", wordBreak: "break-word" }}>{adminUser.email || "—"}</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate(ACCOUNT_PATH);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#0f172a",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  My profile
                </button>
              </div>
            )}
          </div>
        </header>

        <main style={mainScrollStyle}>
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
                  <label style={labelStyle}>Category</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={selectFieldStyle}
                    aria-label="Technician category"
                  >
                    {TECHNICIAN_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
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
    </div>
  );
}
