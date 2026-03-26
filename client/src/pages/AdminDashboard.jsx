import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTechnician } from "../api/adminTechnicians";
import { getAuthToken } from "../api/http";
import { DEFAULT_TECHNICIAN_CATEGORY, TECHNICIAN_CATEGORIES } from "../constants/technicianCategories";
import { removeProfileAvatar, updateProfilePhone, uploadProfileAvatar } from "../api/auth";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../utils/campusUserStorage";
import AdminUsersTable from "../components/admin/AdminUsersTable.jsx";

const shellStyle = {
  height: "100vh",
  display: "flex",
  backgroundColor: "#f1f5f9",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  overflow: "hidden",
};

const sidebarStyle = {
  width: "272px",
  minWidth: "272px",
  background: "linear-gradient(180deg, #14213D 0%, #1a2d4d 100%)",
  color: "#e2e8f0",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  boxSizing: "border-box",
  borderRight: "1px solid rgba(148, 163, 184, 0.12)",
  overflow: "hidden",
};

const mainColumnStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  minWidth: 0,
  overflow: "hidden",
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
  overflowY: "auto",
  overflowX: "hidden",
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

const PHONE_PATTERN = /^[0-9+\-()\s]{7,20}$/;

function isValidPhone(value) {
  const t = (value || "").trim();
  return t.length > 0 && PHONE_PATTERN.test(t);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState("dashboard");
  const [addTechnicianModalOpen, setAddTechnicianModalOpen] = useState(false);
  const [usersTableRev, setUsersTableRev] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profilePhoneDraft, setProfilePhoneDraft] = useState("");
  const [profileSaveState, setProfileSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRev, setUserRev] = useState(0);
  const profileRef = useRef(null);
  const avatarFileRef = useRef(null);

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

  useEffect(() => {
    if (!profileModalOpen) return;
    setProfilePhoneDraft((adminUser?.phoneNumber || "").trim());
    setAvatarBusy(false);
    setAvatarRemoveBusy(false);
    setAvatarError("");
    setAvatarSuccess("");
    setProfileSaveState({ busy: false, message: "", error: "" });
  }, [profileModalOpen, adminUser]);

  useEffect(() => {
    if (!addTechnicianModalOpen) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setCategory(DEFAULT_TECHNICIAN_CATEGORY);
    setPassword("");
    setSubmitting(false);
    setMessage("");
    setError("");
  }, [addTechnicianModalOpen]);

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
      setUsersTableRev((n) => n + 1);
      setAddTechnicianModalOpen(false);
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

  const handleSaveProfilePhone = async () => {
    if (!canSavePhone || profileSaveState.busy) return;
    setProfileSaveState({ busy: true, message: "", error: "" });
    try {
      const updated = await updateProfilePhone({ phoneNumber: profilePhoneDraft.trim() });
      persistCampusUser(updated);
      setProfileSaveState({ busy: false, message: "Changes saved.", error: "" });
    } catch (err) {
      setProfileSaveState({ busy: false, message: "", error: err?.message || "Save failed" });
    }
  };

  const handleProfileAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    setAvatarSuccess("");
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const updated = await uploadProfileAvatar(fd);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo updated.");
    } catch (err) {
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveProfileAvatar = async () => {
    if (!adminUser?.profileImageUrl) return;
    const ok = window.confirm("Remove your profile photo from Smart Campus?");
    if (!ok) return;
    setAvatarError("");
    setAvatarSuccess("");
    setAvatarRemoveBusy(true);
    try {
      const updated = await removeProfileAvatar();
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo removed.");
    } catch (err) {
      setAvatarError(err?.message || "Could not remove photo");
    } finally {
      setAvatarRemoveBusy(false);
    }
  };

  if (!getAuthToken() || !adminUser || adminUser.role !== "ADMIN") {
    return null;
  }

  const serverPhone = (adminUser?.phoneNumber || "").trim();
  const canSavePhone = useMemo(() => {
    const draft = profilePhoneDraft.trim();
    if (!isValidPhone(draft)) return false;
    return draft !== serverPhone;
  }, [adminUser, profilePhoneDraft, serverPhone]);

  const pageTitle =
    panel === "dashboard"
      ? "Dashboard"
      : panel === "resources"
        ? "Resource Management"
        : panel === "bookings"
          ? "Booking Management"
          : panel === "tickets"
            ? "Ticket Management"
            : panel === "users"
              ? "User Management"
              : panel === "notifications"
                ? "Notification"
                : "Analytics & Report";

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
      <aside
        style={{
          ...sidebarStyle,
          width: sidebarCollapsed ? "92px" : "272px",
          minWidth: sidebarCollapsed ? "92px" : "272px",
          transition: "width 0.2s ease, min-width 0.2s ease",
        }}
      >
        <div style={{ padding: "22px 18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            {!sidebarCollapsed && (
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
            )}
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#f8fafc" }}>Admin</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>Smart Campus</div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? "Open menu" : "Close menu"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(148, 163, 184, 0.12)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e2e8f0",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
          </button>
        </div>

        <nav style={{ flex: 1, padding: "4px 0" }} aria-label="Admin sections">
          {!sidebarCollapsed && <div style={sectionLabelStyle}>MENU</div>}

          {!sidebarCollapsed && (
            <>
              <button type="button" style={navRowStyle(panel === "dashboard")} onClick={() => setPanel("dashboard")}>
                Dashboard
              </button>
              <button type="button" style={navRowStyle(panel === "resources")} onClick={() => setPanel("resources")}>
                Resource Management
              </button>
              <button type="button" style={navRowStyle(panel === "bookings")} onClick={() => setPanel("bookings")}>
                Booking Management
              </button>
              <button type="button" style={navRowStyle(panel === "tickets")} onClick={() => setPanel("tickets")}>
                Ticket Management
              </button>
              <button
                type="button"
                style={navRowStyle(panel === "users")}
                onClick={() => {
                  setPanel("users");
                }}
              >
                User Management
              </button>
              <button type="button" style={navRowStyle(panel === "notifications")} onClick={() => setPanel("notifications")}>
                Notification
              </button>
              <button type="button" style={navRowStyle(panel === "analytics")} onClick={() => setPanel("analytics")}>
                Analytics & Report
              </button>
            </>
          )}
        </nav>

        {!sidebarCollapsed && (
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
              Logout
            </button>
          </div>
        )}
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
                    setProfileModalOpen(true);
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
            {panel === "dashboard" && "Overview and quick actions for admin operations."}
            {panel === "resources" && "Manage campus resources. (Coming soon)"}
            {panel === "bookings" && "Manage campus bookings and reservations. (Coming soon)"}
            {panel === "tickets" && "Review and manage support tickets. (Coming soon)"}
            {panel === "users" && "Manage all staff accounts, including technicians."}
            {panel === "notifications" && "View and manage admin notifications. (Coming soon)"}
            {panel === "analytics" && "View analytics and reports for tickets and operations. (Coming soon)"}
          </p>

          {panel === "users" && (
            <AdminUsersTable
              refreshKey={usersTableRev}
              onAddTechnician={() => setAddTechnicianModalOpen(true)}
              onRequestRefresh={() => setUsersTableRev((n) => n + 1)}
            />
          )}

          {panel === "dashboard" && <div style={PLACEHOLDER_STYLE}>Select a section from the left menu.</div>}

          {panel === "resources" && <div style={PLACEHOLDER_STYLE}>Resource Management tools will appear here in a future update.</div>}

          {panel === "bookings" && (
            <div style={PLACEHOLDER_STYLE}>Booking Management tools will appear here in a future update.</div>
          )}

          {panel === "tickets" && (
            <div style={PLACEHOLDER_STYLE}>Ticket Management tools will appear here in a future update.</div>
          )}

          {panel === "notifications" && (
            <div style={PLACEHOLDER_STYLE}>Notifications tools will appear here in a future update.</div>
          )}

          {panel === "analytics" && (
            <div style={PLACEHOLDER_STYLE}>Analytics & Report tools will appear here in a future update.</div>
          )}
        </main>

        {addTechnicianModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1001,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAddTechnicianModalOpen(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "760px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Add technician</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>
                    Create a technician account (email/password)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddTechnicianModalOpen(false)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    fontWeight: 900,
                    fontSize: "14px",
                    cursor: "pointer",
                    color: "#0f172a",
                  }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ padding: "18px 22px 22px" }}>
                <form onSubmit={handleSubmitTechnician} style={{ display: "grid", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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
            </div>
          </div>
        )}

        {profileModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setProfileModalOpen(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "760px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>My profile</div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>
                    Personal info (admin)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    fontWeight: 900,
                    cursor: "pointer",
                    color: "#111827",
                  }}
                >
                  Close
                </button>
              </div>

              <div style={{ padding: "22px" }}>
                <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "170px" }}>
                    <div
                      style={{
                        width: "110px",
                        height: "110px",
                        borderRadius: "50%",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {adminUser.profileImageUrl ? (
                        <img
                          src={adminUser.profileImageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "42px", fontWeight: 900, color: "#6b7280" }}>
                          {profileInitial(adminUser)}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: "14px", width: "100%" }}>
                      <input
                        ref={avatarFileRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleProfileAvatarChange}
                      />

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
                        <button
                          type="button"
                          disabled={avatarBusy || avatarRemoveBusy}
                          onClick={() => avatarFileRef.current?.click()}
                          style={{
                            padding: "10px 16px",
                            borderRadius: "10px",
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            fontWeight: 900,
                            fontSize: "14px",
                            cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                            color: "#111827",
                          }}
                        >
                          {avatarBusy ? "Saving…" : adminUser.profileImageUrl ? "Change photo" : "Upload photo"}
                        </button>

                        {adminUser.profileImageUrl && (
                          <button
                            type="button"
                            disabled={avatarBusy || avatarRemoveBusy}
                            onClick={handleRemoveProfileAvatar}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "10px",
                              border: "1px solid #fecaca",
                              background: "#ffffff",
                              fontWeight: 900,
                              fontSize: "14px",
                              cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                              color: "#b91c1c",
                            }}
                          >
                            {avatarRemoveBusy ? "Removing…" : "Remove photo"}
                          </button>
                        )}
                      </div>

                      {avatarSuccess && (
                        <p style={{ margin: "10px 0 0 0", fontSize: "13px", color: "#059669", fontWeight: 800 }}>
                          {avatarSuccess}
                        </p>
                      )}
                      {avatarError && (
                        <p style={{ margin: "10px 0 0 0", fontSize: "13px", color: "#b91c1c", fontWeight: 800 }}>
                          {avatarError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: "280px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={labelStyle}>Email address</label>
                        <input
                          type="email"
                          readOnly
                          disabled
                          value={adminUser.email || ""}
                          style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Phone number</label>
                        <input
                          type="tel"
                          value={profilePhoneDraft}
                          onChange={(e) => {
                            setProfilePhoneDraft(e.target.value);
                            setProfileSaveState((s) => ({ ...s, message: "", error: "" }));
                          }}
                          placeholder="+94 77 123 4567"
                          style={inputStyle}
                          autoComplete="tel"
                        />
                        <p style={{ fontSize: "12px", color: "#9ca3af", margin: "6px 0 0 0" }}>
                          7–20 characters: digits, spaces, +, -, ( )
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={labelStyle}>First name</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={adminUser.firstName || ""}
                          style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Last name</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={adminUser.lastName || ""}
                          style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "14px" }}>
                      {profileSaveState.message && (
                        <span style={{ fontSize: "14px", color: "#059669", fontWeight: 900 }}>
                          {profileSaveState.message}
                        </span>
                      )}
                      {profileSaveState.error && (
                        <span style={{ fontSize: "14px", color: "#b91c1c", fontWeight: 900 }}>
                          {profileSaveState.error}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={!canSavePhone || profileSaveState.busy}
                        onClick={handleSaveProfilePhone}
                        style={{
                          padding: "12px 20px",
                          borderRadius: "10px",
                          border: "none",
                          backgroundColor: canSavePhone && !profileSaveState.busy ? "#FA8112" : "#d1d5db",
                          color: "#ffffff",
                          fontWeight: 900,
                          cursor: canSavePhone && !profileSaveState.busy ? "pointer" : "not-allowed",
                        }}
                      >
                        {profileSaveState.busy ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
