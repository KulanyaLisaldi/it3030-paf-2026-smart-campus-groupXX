import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "../../api/http";
import { changeMyPassword, removeProfileAvatar, updateProfilePhone, uploadProfileAvatar, verifyMyPasswordChange } from "../../api/auth";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../../utils/campusUserStorage";
import PasswordInput from "../PasswordInput.jsx";
import { isValidProfilePhone, phoneFromServer, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../../utils/profilePhone";
import campusSyncLogo from "../../assets/campus-sync-logo.png";
import NotificationBell from "../notifications/NotificationBell.jsx";

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
  backgroundColor: "#FFFFFF",
  color: "#334155",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  boxSizing: "border-box",
  borderRight: "1px solid #e5e7eb",
  overflow: "hidden",
};
const mainColumnStyle = { flex: 1, display: "flex", flexDirection: "column", height: "100vh", minWidth: 0, overflow: "hidden" };
const topBarStyle = { flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0" };
const mainScrollStyle = { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "28px 28px 40px", boxSizing: "border-box" };
const sectionLabelStyle = { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#64748b", padding: "0 16px", marginTop: "20px", marginBottom: "8px" };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "2px solid #F5E7C6", fontSize: "15px", outline: "none", boxSizing: "border-box", backgroundColor: "#FFFFFF", color: "#222222" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" };
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const getPasswordChecks = (value) => {
  const v = value || "";
  return {
    minLength: v.length >= 8,
    hasComplexity: /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z\d]/.test(v),
  };
};

function navRowStyle(active) {
  return {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    width: "100%",
    textAlign: "left",
    padding: "11px 16px",
    margin: "2px 8px",
    borderRadius: "10px",
    border: "none",
    background: active ? "rgba(250, 129, 18, 0.14)" : "transparent",
    color: active ? "#c2410c" : "#475569",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxSizing: "border-box",
    borderLeft: active ? "3px solid #FA8112" : "3px solid transparent",
  };
}

const routesBySection = {
  resources: "/adminresources",
  bookings: "/adminbookings",
  tickets: "/adminticket",
  users: "/adminusers",
  contactMessages: "/admincontactmessages",
  notifications: "/adminnotifications",
};

export default function AdminLayout({ activeSection, pageTitle, description, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resourceMenuOpen, setResourceMenuOpen] = useState(activeSection === "resources");
  const [bookingMenuOpen, setBookingMenuOpen] = useState(activeSection === "bookings");
  const [userMenuOpen, setUserMenuOpen] = useState(activeSection === "users");
  const [userRev, setUserRev] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordOtpCode, setPasswordOtpCode] = useState("");
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordState, setPasswordState] = useState({ busy: false, message: "", error: "" });
  const [profileFirstNameDraft, setProfileFirstNameDraft] = useState("");
  const [profileLastNameDraft, setProfileLastNameDraft] = useState("");
  const [profilePhoneDraft, setProfilePhoneDraft] = useState("");
  const [profileSaveState, setProfileSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const profileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const adminUser = useMemo(() => readCampusUser(), [userRev]);

  useEffect(() => {
    const token = getAuthToken();
    const user = readCampusUser();
    if (!token || !user || user.role !== "ADMIN") navigate("/signin", { replace: true });
  }, [navigate]);
  useEffect(() => {
    const onUserUpdated = () => setUserRev((n) => n + 1);
    window.addEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
    return () => window.removeEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
  }, []);
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);
  useEffect(() => {
    if (activeSection === "resources") setResourceMenuOpen(true);
  }, [activeSection]);
  useEffect(() => {
    if (activeSection === "bookings") setBookingMenuOpen(true);
  }, [activeSection]);
  useEffect(() => {
    if (activeSection === "users") setUserMenuOpen(true);
  }, [activeSection]);
  useEffect(() => {
    if (!profileModalOpen) return;
    setProfileFirstNameDraft((adminUser?.firstName || "").trim());
    setProfileLastNameDraft((adminUser?.lastName || "").trim());
    setProfilePhoneDraft(phoneFromServer(adminUser?.phoneNumber));
    setAvatarBusy(false);
    setAvatarRemoveBusy(false);
    setAvatarError("");
    setAvatarSuccess("");
    setProfileSaveState({ busy: false, message: "", error: "" });
  }, [profileModalOpen, adminUser]);

  if (!getAuthToken() || !adminUser || adminUser.role !== "ADMIN") return null;
  const serverPhone = phoneFromServer(adminUser?.phoneNumber);
  const serverFirstName = (adminUser?.firstName || "").trim();
  const serverLastName = (adminUser?.lastName || "").trim();
  const canSaveProfile =
    isValidProfilePhone(profilePhoneDraft) &&
    !!profileFirstNameDraft.trim() &&
    (profilePhoneDraft !== serverPhone ||
      profileFirstNameDraft.trim() !== serverFirstName ||
      profileLastNameDraft.trim() !== serverLastName);
  const displayName = `${(adminUser.firstName || "").trim()} ${(adminUser.lastName || "").trim()}`.trim() || adminUser.email || "Admin";
  const initial = ((adminUser.firstName || adminUser.email || "A").trim().charAt(0) || "A").toUpperCase();
  const handleLogout = () => {
    persistCampusUser(null);
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/", { replace: true });
  };
  const handleChangePassword = () => {
    setProfileMenuOpen(false);
    const provider = String(adminUser?.provider || "").toLowerCase();
    if (provider.includes("google")) {
      window.alert("This account uses Google sign-in. Password change is available only for Email accounts.");
      return;
    }
    setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordOtpCode("");
    setPasswordOtpSent(false);
    setPasswordState({ busy: false, message: "", error: "" });
    setPasswordModalOpen(true);
  };
  const handleSubmitPassword = async () => {
    const currentPassword = passwordDraft.currentPassword;
    const newPassword = passwordDraft.newPassword;
    const confirmPassword = passwordDraft.confirmPassword;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordState({ busy: false, message: "", error: "All fields are required." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordState({ busy: false, message: "", error: "Password must be at least 8 characters." });
      return;
    }
    if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
      setPasswordState({ busy: false, message: "", error: "Must include uppercase, lowercase, number, and symbol." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordState({ busy: false, message: "", error: "Passwords do not match" });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordState({ busy: false, message: "", error: "New password must be different from current password." });
      return;
    }
    setPasswordState({ busy: true, message: "", error: "" });
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setPasswordOtpSent(true);
      setPasswordState({ busy: false, message: "Verification code sent to your email.", error: "" });
    } catch (err) {
      setPasswordState({ busy: false, message: "", error: err?.message || "Could not change password" });
    }
  };
  const handleVerifyPasswordOtp = async () => {
    const code = (passwordOtpCode || "").trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setPasswordState({ busy: false, message: "", error: "Enter the 6-digit verification code." });
      return;
    }
    setPasswordState({ busy: true, message: "", error: "" });
    try {
      await verifyMyPasswordChange({ code });
      setPasswordState({ busy: false, message: "Password changed successfully.", error: "" });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordOtpCode("");
      setPasswordOtpSent(false);
    } catch (err) {
      setPasswordState({ busy: false, message: "", error: err?.message || "Could not verify code" });
    }
  };
  const passwordChecks = getPasswordChecks(passwordDraft.newPassword);
  const canSubmitPassword =
    !!passwordDraft.currentPassword &&
    !!passwordDraft.newPassword &&
    !!passwordDraft.confirmPassword &&
    passwordChecks.minLength &&
    passwordChecks.hasComplexity &&
    passwordDraft.newPassword === passwordDraft.confirmPassword &&
    passwordDraft.newPassword !== passwordDraft.currentPassword;

  return (
    <div style={shellStyle}>
      <aside style={{ ...sidebarStyle, width: sidebarCollapsed ? "92px" : "272px", minWidth: sidebarCollapsed ? "92px" : "272px", transition: "width 0.2s ease, min-width 0.2s ease" }}>
        {sidebarCollapsed ? (
          <div
            style={{
              padding: "14px 10px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="CampusSync home"
              style={{
                width: "100%",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={campusSyncLogo}
                alt="CampusSync"
                style={{
                  display: "block",
                  height: 36,
                  width: "auto",
                  maxWidth: 72,
                  objectFit: "contain",
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Open menu"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#334155",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "18px 16px 16px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="CampusSync home"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <img
                src={campusSyncLogo}
                alt="CampusSync"
                style={{
                  display: "block",
                  height: "clamp(38px, 3.8vw, 44px)",
                  width: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Close menu"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#334155",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
            </button>
          </div>
        )}
        <nav style={{ flex: 1, padding: "4px 0" }} aria-label="Admin sections">
          {!sidebarCollapsed && <div style={sectionLabelStyle}>MENU</div>}
          {!sidebarCollapsed && (
            <>
              <div style={{ margin: "2px 8px" }}>
                <button
                  type="button"
                  style={{ ...navRowStyle(false), margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  onClick={() => setResourceMenuOpen((open) => !open)}
                >
                  <span>Resource Management</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{resourceMenuOpen ? "▼" : "▶"}</span>
                </button>
                {resourceMenuOpen && (
                  <div style={{ marginTop: 4, marginLeft: 10, display: "grid", gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => navigate("/adminresources?tab=overview")}
                      style={{
                        ...navRowStyle(activeSection === "resources" && location.pathname === "/adminresources" && new URLSearchParams(location.search).get("tab") !== "details"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/adminresources?tab=details")}
                      style={{
                        ...navRowStyle(activeSection === "resources" && location.pathname === "/adminresources" && new URLSearchParams(location.search).get("tab") === "details"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      Resource Details
                    </button>
                  </div>
                )}
              </div>
              <div style={{ margin: "2px 8px" }}>
                <button
                  type="button"
                  style={{ ...navRowStyle(false), margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  onClick={() => setBookingMenuOpen((open) => !open)}
                >
                  <span>Booking Management</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{bookingMenuOpen ? "▼" : "▶"}</span>
                </button>
                {bookingMenuOpen && (
                  <div style={{ marginTop: 4, marginLeft: 10, display: "grid", gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => navigate("/adminbookings?tab=overview")}
                      style={{
                        ...navRowStyle(activeSection === "bookings" && location.pathname === "/adminbookings" && new URLSearchParams(location.search).get("tab") !== "calendar" && new URLSearchParams(location.search).get("tab") !== "details"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/adminbookings?tab=calendar")}
                      style={{
                        ...navRowStyle(activeSection === "bookings" && location.pathname === "/adminbookings" && new URLSearchParams(location.search).get("tab") === "calendar"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      Calendar View
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/adminbookings?tab=details")}
                      style={{
                        ...navRowStyle(activeSection === "bookings" && location.pathname === "/adminbookings" && new URLSearchParams(location.search).get("tab") === "details"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      Booking Details
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/qr-checkin")}
                      style={{
                        ...navRowStyle(location.pathname === "/admin/qr-checkin"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      QR Check-In
                    </button>
                  </div>
                )}
              </div>
              <button type="button" style={navRowStyle(activeSection === "tickets")} onClick={() => navigate(routesBySection.tickets)}>Ticket Management</button>
              <div style={{ margin: "2px 8px" }}>
                <button
                  type="button"
                  style={{ ...navRowStyle(false), margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  onClick={() => setUserMenuOpen((open) => !open)}
                >
                  <span>User Management</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{userMenuOpen ? "▼" : "▶"}</span>
                </button>
                {userMenuOpen && (
                  <div style={{ marginTop: 4, marginLeft: 10, display: "grid", gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => navigate("/adminusers?tab=overview")}
                      style={{
                        ...navRowStyle(activeSection === "users" && location.pathname === "/adminusers" && new URLSearchParams(location.search).get("tab") !== "details" && new URLSearchParams(location.search).get("tab") !== "all-users"),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/adminusers?tab=details")}
                      style={{
                        ...navRowStyle(activeSection === "users" && location.pathname === "/adminusers" && (new URLSearchParams(location.search).get("tab") === "details" || new URLSearchParams(location.search).get("tab") === "all-users")),
                        margin: 0,
                        padding: "8px 12px",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      User Details
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                style={navRowStyle(activeSection === "contactMessages")}
                onClick={() => navigate(routesBySection.contactMessages)}
              >
                Contact Management
              </button>
              <button type="button" style={navRowStyle(activeSection === "notifications")} onClick={() => navigate(routesBySection.notifications)}>Notification</button>
            </>
          )}
        </nav>
      </aside>
      <div style={mainColumnStyle}>
        <header style={topBarStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
              {`Welcome back, ${displayName}`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <NotificationBell />
            <div ref={profileRef} style={{ position: "relative" }}>
              <button type="button" aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-label="Account menu" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: adminUser.profileImageUrl ? "#fff" : "#475569", color: "#fff", fontWeight: 700, fontSize: "16px", overflow: "hidden", boxShadow: profileMenuOpen ? "0 0 0 2px #FA8112" : "0 0 0 1px #e2e8f0" }} onClick={() => setProfileMenuOpen((o) => !o)}>
                {adminUser.profileImageUrl ? <img src={adminUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
              </button>
              {profileMenuOpen && (
                <div role="menu" style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: "min(280px, calc(100vw - 48px))", backgroundColor: "rgba(15, 23, 42, 0.08)", border: "1px solid rgba(148, 163, 184, 0.45)", borderRadius: "12px", boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)", padding: "16px", zIndex: 50, backdropFilter: "blur(10px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: adminUser.profileImageUrl ? "#f1f5f9" : "#475569", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "18px", overflow: "hidden" }}>{adminUser.profileImageUrl ? <img src={adminUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>{displayName}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", wordBreak: "break-word" }}>{adminUser.email || "—"}</div>
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setProfileModalOpen(true); }} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(226, 232, 240, 0.9)", background: "rgba(255, 255, 255, 0.15)", fontWeight: 600, fontSize: "14px", color: "#0f172a", cursor: "pointer", textAlign: "left" }}>My profile</button>
                  <button type="button" role="menuitem" onClick={handleChangePassword} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(226, 232, 240, 0.9)", background: "rgba(255, 255, 255, 0.15)", fontWeight: 600, fontSize: "14px", color: "#0f172a", cursor: "pointer", textAlign: "left", marginTop: 8 }}>Change Password</button>
                  <button type="button" role="menuitem" onClick={handleLogout} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(248, 113, 113, 0.35)", background: "rgba(255, 255, 255, 0.15)", fontWeight: 700, fontSize: "14px", color: "#b91c1c", cursor: "pointer", textAlign: "left", marginTop: 8 }}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main style={mainScrollStyle}>
          {pageTitle ? <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>{pageTitle}</h1> : null}
          {description ? <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>{description}</p> : null}
          {children}
        </main>
        {profileModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-profile-drawer-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              backgroundColor: "rgba(15, 23, 42, 0.32)",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "flex-start",
              padding: "12px 12px 12px 0",
              boxSizing: "border-box",
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setProfileModalOpen(false);
            }}
          >
            <style>{`
              @keyframes adminProfileDrawerIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            <div
              style={{
                width: "min(380px, calc(100vw - 16px))",
                maxWidth: "100%",
                maxHeight: "calc(100vh - 24px)",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                boxShadow: "-8px 12px 32px rgba(15, 23, 42, 0.12)",
                animation: "adminProfileDrawerIn 0.22s ease-out",
                alignSelf: "flex-start",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  padding: "12px 14px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "#fff",
                }}
              >
                <div>
                  <div id="admin-profile-drawer-title" style={{ fontSize: "17px", fontWeight: 900, color: "#111827", lineHeight: 1.2 }}>
                    My profile
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>Personal info (admin)</div>
                </div>
                <button
                  type="button"
                  aria-label="Close profile"
                  onClick={() => setProfileModalOpen(false)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                    color: "#0f172a",
                    flexShrink: 0,
                  }}
                >
                  Close
                </button>
              </div>
              <div
                style={{
                  padding: "12px 14px 14px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ width: "100%" }}>
                    <input ref={avatarFileRef} type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setAvatarError(""); setAvatarSuccess(""); setAvatarBusy(true); try { const fd = new FormData(); fd.append("file", file); const updated = await uploadProfileAvatar(fd); persistCampusUser(updated); setAvatarSuccess("Profile photo updated."); } catch (err) { setAvatarError(err?.message || "Upload failed"); } finally { setAvatarBusy(false); } }} style={{ display: "none" }} />
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                      <div style={{ width: "88px", height: "88px", borderRadius: "999px", margin: "0 auto", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#334155", fontSize: "28px", fontWeight: 800 }}>{adminUser.profileImageUrl ? <img src={adminUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}</div>
                      <div style={{ marginTop: "8px", display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button type="button" disabled={avatarBusy || avatarRemoveBusy} onClick={() => avatarFileRef.current?.click()} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#ffffff", fontWeight: 800, fontSize: "13px", cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer", color: "#111827" }}>{avatarBusy ? "Saving…" : adminUser.profileImageUrl ? "Change photo" : "Upload photo"}</button>
                        {adminUser.profileImageUrl ? <button type="button" disabled={avatarBusy || avatarRemoveBusy} onClick={async () => { const ok = window.confirm("Remove your profile photo from CampusSync?"); if (!ok) return; setAvatarError(""); setAvatarSuccess(""); setAvatarRemoveBusy(true); try { const updated = await removeProfileAvatar(); persistCampusUser(updated); setAvatarSuccess("Profile photo removed."); } catch (err) { setAvatarError(err?.message || "Could not remove photo"); } finally { setAvatarRemoveBusy(false); } }} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #fecaca", background: "#ffffff", fontWeight: 800, fontSize: "13px", cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer", color: "#b91c1c" }}>{avatarRemoveBusy ? "Removing…" : "Remove photo"}</button> : null}
                      </div>
                      {avatarSuccess ? <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#059669", fontWeight: 800 }}>{avatarSuccess}</p> : null}
                      {avatarError ? <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#b91c1c", fontWeight: 800 }}>{avatarError}</p> : null}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                      <div>
                        <label style={labelStyle}>Email address</label>
                        <input type="email" readOnly disabled value={adminUser.email || ""} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151", padding: "10px 12px" }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Phone number</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={PROFILE_PHONE_DIGITS}
                          value={profilePhoneDraft}
                          onChange={(e) => {
                            setProfilePhoneDraft(sanitizeProfilePhoneInput(e.target.value));
                            setProfileSaveState((s) => ({ ...s, message: "", error: "" }));
                          }}
                          placeholder="0771234567"
                          style={{ ...inputStyle, padding: "10px 12px" }}
                        />
                        <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#9ca3af", fontWeight: 600 }}>
                          {PROFILE_PHONE_DIGITS} digits only (no letters).
                        </p>
                      </div>
                    </div>
                    <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={labelStyle}>First name</label>
                        <input
                          type="text"
                          value={profileFirstNameDraft}
                          onChange={(e) => {
                            setProfileFirstNameDraft(e.target.value);
                            setProfileSaveState((s) => ({ ...s, message: "", error: "" }));
                          }}
                          style={{ ...inputStyle, padding: "10px 12px" }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Last name</label>
                        <input
                          type="text"
                          value={profileLastNameDraft}
                          onChange={(e) => {
                            setProfileLastNameDraft(e.target.value);
                            setProfileSaveState((s) => ({ ...s, message: "", error: "" }));
                          }}
                          style={{ ...inputStyle, padding: "10px 12px" }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <button type="button" disabled={!canSaveProfile || profileSaveState.busy} onClick={async () => { if (!canSaveProfile || profileSaveState.busy) return; setProfileSaveState({ busy: true, message: "", error: "" }); try { const updated = await updateProfilePhone({ firstName: profileFirstNameDraft.trim(), lastName: profileLastNameDraft.trim(), phoneNumber: profilePhoneDraft }); persistCampusUser(updated); setProfileSaveState({ busy: false, message: "Changes saved.", error: "" }); } catch (err) { setProfileSaveState({ busy: false, message: "", error: err?.message || "Save failed" }); } }} style={{ padding: "10px 14px", borderRadius: "10px", border: "none", backgroundColor: "#FA8112", color: "#fff", fontWeight: 800, fontSize: "14px", cursor: !canSaveProfile || profileSaveState.busy ? "not-allowed" : "pointer", opacity: !canSaveProfile || profileSaveState.busy ? 0.6 : 1 }}>{profileSaveState.busy ? "Saving..." : "Save changes"}</button>
                      {profileSaveState.message ? <span style={{ color: "#15803d", fontWeight: 700, fontSize: "12px" }}>{profileSaveState.message}</span> : null}
                      {profileSaveState.error ? <span style={{ color: "#b91c1c", fontWeight: 700, fontSize: "12px" }}>{profileSaveState.error}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {passwordModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{ position: "fixed", inset: 0, zIndex: 1100, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setPasswordModalOpen(false); }}
          >
            <div style={{ width: "100%", maxWidth: "520px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Change Password</div>
                <button type="button" onClick={() => setPasswordModalOpen(false)} style={{ border: "none", background: "transparent", fontWeight: 800, cursor: "pointer", color: "#0f172a" }}>Close</button>
              </div>
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "12px" }}>
                  <div><label style={labelStyle}>Current password</label><PasswordInput value={passwordDraft.currentPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, currentPassword: e.target.value }))} style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>New password</label>
                    <PasswordInput value={passwordDraft.newPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, newPassword: e.target.value }))} style={inputStyle} />
                    <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                      <div style={{ color: passwordChecks.minLength ? "#15803d" : "#6b7280" }}>Password must be at least 8 characters</div>
                      <div style={{ color: passwordChecks.hasComplexity ? "#15803d" : "#6b7280" }}>Must include uppercase, lowercase, number, symbol</div>
                      <div style={{ color: (passwordDraft.newPassword && passwordDraft.newPassword === passwordDraft.currentPassword) ? "#b91c1c" : "#6b7280" }}>New password must be different from current password</div>
                    </div>
                  </div>
                  <div><label style={labelStyle}>Confirm new password</label><PasswordInput value={passwordDraft.confirmPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, confirmPassword: e.target.value }))} style={inputStyle} /></div>
                  {passwordOtpSent && (
                    <div>
                      <label style={labelStyle}>Verification code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={passwordOtpCode}
                        onChange={(e) => setPasswordOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit code"
                        style={inputStyle}
                      />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    {passwordState.error ? <div style={{ color: "#b91c1c", fontSize: "13px", fontWeight: 700 }}>{passwordState.error}</div> : null}
                    {passwordState.message ? <div style={{ color: "#15803d", fontSize: "13px", fontWeight: 700 }}>{passwordState.message}</div> : null}
                  </div>
                  <button
                    type="button"
                    onClick={passwordOtpSent ? handleVerifyPasswordOtp : handleSubmitPassword}
                    disabled={passwordState.busy || (passwordOtpSent ? !/^[0-9]{6}$/.test(passwordOtpCode) : !canSubmitPassword)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#FA8112",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: passwordState.busy || (passwordOtpSent ? !/^[0-9]{6}$/.test(passwordOtpCode) : !canSubmitPassword) ? "not-allowed" : "pointer",
                      opacity: passwordState.busy || (passwordOtpSent ? !/^[0-9]{6}$/.test(passwordOtpCode) : !canSubmitPassword) ? 0.6 : 1,
                    }}
                  >
                    {passwordState.busy ? "Saving..." : passwordOtpSent ? "Verify & update" : "Send verification code"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

