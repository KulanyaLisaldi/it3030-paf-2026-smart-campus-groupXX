import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../../api/http";
import { changeMyPassword, removeProfileAvatar, updateProfilePhone, uploadProfileAvatar } from "../../api/auth";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../../utils/campusUserStorage";
import PasswordInput from "../PasswordInput.jsx";

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
const mainColumnStyle = { flex: 1, display: "flex", flexDirection: "column", height: "100vh", minWidth: 0, overflow: "hidden" };
const topBarStyle = { flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", padding: "14px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0" };
const mainScrollStyle = { flex: 1, overflowY: "auto", overflowX: "hidden", padding: "28px 28px 40px", boxSizing: "border-box" };
const sectionLabelStyle = { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "#94a3b8", padding: "0 16px", marginTop: "20px", marginBottom: "8px" };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "2px solid #F5E7C6", fontSize: "15px", outline: "none", boxSizing: "border-box", backgroundColor: "#FFFFFF", color: "#222222" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" };
const PHONE_PATTERN = /^[0-9+\-()\s]{7,20}$/;
const isValidPhone = (v) => (v || "").trim().length > 0 && PHONE_PATTERN.test((v || "").trim());
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
    background: active ? "rgba(250, 129, 18, 0.2)" : "transparent",
    color: active ? "#fb923c" : "#cbd5e1",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxSizing: "border-box",
    borderLeft: active ? "3px solid #FA8112" : "3px solid transparent",
  };
}

const routesBySection = {
  dashboard: "/admin",
  resources: "/adminresources",
  bookings: "/adminbookings",
  tickets: "/adminticket",
  users: "/adminusers",
  notifications: "/adminnotifications",
  analytics: "/adminanalytics",
};

export default function AdminLayout({ activeSection, pageTitle, description, children }) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRev, setUserRev] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordState, setPasswordState] = useState({ busy: false, message: "", error: "" });
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
    if (!profileModalOpen) return;
    setProfilePhoneDraft((adminUser?.phoneNumber || "").trim());
    setAvatarBusy(false);
    setAvatarRemoveBusy(false);
    setAvatarError("");
    setAvatarSuccess("");
    setProfileSaveState({ busy: false, message: "", error: "" });
  }, [profileModalOpen, adminUser]);

  if (!getAuthToken() || !adminUser || adminUser.role !== "ADMIN") return null;
  const serverPhone = (adminUser?.phoneNumber || "").trim();
  const canSavePhone = isValidPhone(profilePhoneDraft) && profilePhoneDraft.trim() !== serverPhone;
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
    setPasswordState({ busy: true, message: "", error: "" });
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setPasswordState({ busy: false, message: "Password changed successfully.", error: "" });
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordState({ busy: false, message: "", error: err?.message || "Could not change password" });
    }
  };
  const passwordChecks = getPasswordChecks(passwordDraft.newPassword);
  const canSubmitPassword =
    !!passwordDraft.currentPassword &&
    !!passwordDraft.newPassword &&
    !!passwordDraft.confirmPassword &&
    passwordChecks.minLength &&
    passwordChecks.hasComplexity &&
    passwordDraft.newPassword === passwordDraft.confirmPassword;

  return (
    <div style={shellStyle}>
      <aside style={{ ...sidebarStyle, width: sidebarCollapsed ? "92px" : "272px", minWidth: sidebarCollapsed ? "92px" : "272px", transition: "width 0.2s ease, min-width 0.2s ease" }}>
        <div style={{ padding: "22px 18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div />
          <button type="button" onClick={() => setSidebarCollapsed((v) => !v)} aria-label={sidebarCollapsed ? "Open menu" : "Close menu"} style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(148, 163, 184, 0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#e2e8f0", flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
          </button>
        </div>
        <nav style={{ flex: 1, padding: "4px 0" }} aria-label="Admin sections">
          {!sidebarCollapsed && <div style={sectionLabelStyle}>MENU</div>}
          {!sidebarCollapsed && (
            <>
              <button type="button" style={navRowStyle(activeSection === "dashboard")} onClick={() => navigate(routesBySection.dashboard)}>Dashboard</button>
              <button type="button" style={navRowStyle(activeSection === "resources")} onClick={() => navigate(routesBySection.resources)}>Resource Management</button>
              <button type="button" style={navRowStyle(activeSection === "bookings")} onClick={() => navigate(routesBySection.bookings)}>Booking Management</button>
              <button type="button" style={navRowStyle(activeSection === "tickets")} onClick={() => navigate(routesBySection.tickets)}>Ticket Management</button>
              <button type="button" style={navRowStyle(activeSection === "users")} onClick={() => navigate(routesBySection.users)}>User Management</button>
              <button type="button" style={navRowStyle(activeSection === "notifications")} onClick={() => navigate(routesBySection.notifications)}>Notification</button>
              <button type="button" style={navRowStyle(activeSection === "analytics")} onClick={() => navigate(routesBySection.analytics)}>Analytics & Report</button>
            </>
          )}
        </nav>
      </aside>
      <div style={mainColumnStyle}>
        <header style={topBarStyle}>
          <button
            type="button"
            aria-label="Notifications"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            🔔
          </button>
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
        </header>
        <main style={mainScrollStyle}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>{pageTitle}</h1>
          {description ? <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>{description}</p> : null}
          {children}
        </main>
        {profileModalOpen && (
          <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }} onMouseDown={(e) => { if (e.target === e.currentTarget) setProfileModalOpen(false); }}>
            <div style={{ width: "100%", maxWidth: "760px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden" }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div><div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>My profile</div><div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>Personal info (admin)</div></div>
                <button type="button" onClick={() => setProfileModalOpen(false)} style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, fontSize: "14px", cursor: "pointer", color: "#0f172a" }}>Close</button>
              </div>
              <div style={{ padding: "18px 22px 22px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
                  <div style={{ width: "220px", minWidth: "220px" }}>
                    <input ref={avatarFileRef} type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setAvatarError(""); setAvatarSuccess(""); setAvatarBusy(true); try { const fd = new FormData(); fd.append("file", file); const updated = await uploadProfileAvatar(fd); persistCampusUser(updated); setAvatarSuccess("Profile photo updated."); } catch (err) { setAvatarError(err?.message || "Upload failed"); } finally { setAvatarBusy(false); } }} style={{ display: "none" }} />
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                      <div style={{ width: "110px", height: "110px", borderRadius: "999px", margin: "0 auto", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#334155", fontSize: "34px", fontWeight: 800 }}>{adminUser.profileImageUrl ? <img src={adminUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}</div>
                      <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button type="button" disabled={avatarBusy || avatarRemoveBusy} onClick={() => avatarFileRef.current?.click()} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#ffffff", fontWeight: 900, fontSize: "14px", cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer", color: "#111827" }}>{avatarBusy ? "Saving…" : adminUser.profileImageUrl ? "Change photo" : "Upload photo"}</button>
                        {adminUser.profileImageUrl ? <button type="button" disabled={avatarBusy || avatarRemoveBusy} onClick={async () => { const ok = window.confirm("Remove your profile photo from Smart Campus?"); if (!ok) return; setAvatarError(""); setAvatarSuccess(""); setAvatarRemoveBusy(true); try { const updated = await removeProfileAvatar(); persistCampusUser(updated); setAvatarSuccess("Profile photo removed."); } catch (err) { setAvatarError(err?.message || "Could not remove photo"); } finally { setAvatarRemoveBusy(false); } }} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #fecaca", background: "#ffffff", fontWeight: 900, fontSize: "14px", cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer", color: "#b91c1c" }}>{avatarRemoveBusy ? "Removing…" : "Remove photo"}</button> : null}
                      </div>
                      {avatarSuccess ? <p style={{ margin: "10px 0 0 0", fontSize: "13px", color: "#059669", fontWeight: 800 }}>{avatarSuccess}</p> : null}
                      {avatarError ? <p style={{ margin: "10px 0 0 0", fontSize: "13px", color: "#b91c1c", fontWeight: 800 }}>{avatarError}</p> : null}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: "280px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div><label style={labelStyle}>Email address</label><input type="email" readOnly disabled value={adminUser.email || ""} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151" }} /></div>
                      <div><label style={labelStyle}>Phone number</label><input type="tel" value={profilePhoneDraft} onChange={(e) => { setProfilePhoneDraft(e.target.value); setProfileSaveState((s) => ({ ...s, message: "", error: "" })); }} placeholder="+94 77 123 4567" style={inputStyle} /></div>
                    </div>
                    <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div><label style={labelStyle}>First name</label><input type="text" readOnly disabled value={adminUser.firstName || ""} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151" }} /></div>
                      <div><label style={labelStyle}>Last name</label><input type="text" readOnly disabled value={adminUser.lastName || ""} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#374151" }} /></div>
                    </div>
                    <div style={{ marginTop: "18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <button type="button" disabled={!canSavePhone || profileSaveState.busy} onClick={async () => { if (!canSavePhone || profileSaveState.busy) return; setProfileSaveState({ busy: true, message: "", error: "" }); try { const updated = await updateProfilePhone({ phoneNumber: profilePhoneDraft.trim() }); persistCampusUser(updated); setProfileSaveState({ busy: false, message: "Changes saved.", error: "" }); } catch (err) { setProfileSaveState({ busy: false, message: "", error: err?.message || "Save failed" }); } }} style={{ padding: "12px 16px", borderRadius: "10px", border: "none", backgroundColor: "#FA8112", color: "#fff", fontWeight: 800, fontSize: "14px", cursor: !canSavePhone || profileSaveState.busy ? "not-allowed" : "pointer", opacity: !canSavePhone || profileSaveState.busy ? 0.6 : 1 }}>{profileSaveState.busy ? "Saving..." : "Save changes"}</button>
                      {profileSaveState.message ? <span style={{ color: "#15803d", fontWeight: 700, fontSize: "13px" }}>{profileSaveState.message}</span> : null}
                      {profileSaveState.error ? <span style={{ color: "#b91c1c", fontWeight: 700, fontSize: "13px" }}>{profileSaveState.error}</span> : null}
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
                    </div>
                  </div>
                  <div><label style={labelStyle}>Confirm new password</label><PasswordInput value={passwordDraft.confirmPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, confirmPassword: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    {passwordState.error ? <div style={{ color: "#b91c1c", fontSize: "13px", fontWeight: 700 }}>{passwordState.error}</div> : null}
                    {passwordState.message ? <div style={{ color: "#15803d", fontSize: "13px", fontWeight: 700 }}>{passwordState.message}</div> : null}
                  </div>
                  <button type="button" onClick={handleSubmitPassword} disabled={passwordState.busy || !canSubmitPassword} style={{ padding: "10px 14px", borderRadius: "10px", border: "none", backgroundColor: "#FA8112", color: "#fff", fontWeight: 800, cursor: passwordState.busy || !canSubmitPassword ? "not-allowed" : "pointer", opacity: passwordState.busy || !canSubmitPassword ? 0.6 : 1 }}>
                    {passwordState.busy ? "Saving..." : "Update password"}
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

