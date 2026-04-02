import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTechnicianAssignedTickets } from "../api/technicianTickets";
import { changeMyPassword, fetchCurrentUser, removeProfileAvatar, updateProfilePhone, uploadProfileAvatar, verifyMyPasswordChange } from "../api/auth";
import { getAuthToken } from "../api/http";
import { persistCampusUser, readCampusUser } from "../utils/campusUserStorage";
import { appFontFamily } from "../utils/appFont";
import PasswordInput from "../components/PasswordInput.jsx";
import { isValidProfilePhone, phoneFromServer, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../utils/profilePhone";

/** YYYY-MM-DD in the user's local timezone (aligned with weekday labels on the chart). */
function localCalendarDayKey(isoOrMs) {
  const d = new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function volumeDayKeyForAssignedTicket(ticket) {
  const raw = ticket?.technicianAssignedAt || ticket?.createdAt;
  if (!raw) return null;
  return localCalendarDayKey(raw);
}

const shellStyle = {
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #E8E4DC",
  boxShadow: "0 8px 24px rgba(20, 33, 61, 0.06)",
  padding: "clamp(18px, 2.5vw, 26px)",
  boxSizing: "border-box",
};

const chartCardStyle = {
  border: "1px solid #E8E4DC",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 2px 8px rgba(20, 33, 61, 0.04)",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "10px",
};

const metricCardStyle = {
  border: "1px solid #E8E4DC",
  borderRadius: "12px",
  padding: "12px 14px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 2px 8px rgba(20, 33, 61, 0.04)",
};

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
function getPasswordChecks(value) {
  const v = value || "";
  return {
    minLength: v.length >= 8,
    hasComplexity: /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z\d]/.test(v),
  };
}

function technicianWelcomeName(user) {
  if (!user) return "Technician";
  const first = (user.firstName || "").trim();
  if (first) return first;
  const em = (user.email || "").trim();
  if (em && em.includes("@")) return em.split("@")[0];
  return "Technician";
}

function techSidebarNavRowStyle(active) {
  return {
    width: "100%",
    textAlign: "left",
    padding: "11px 16px",
    margin: "2px 8px",
    borderRadius: "10px",
    border: "none",
    background: active ? "rgba(250, 129, 18, 0.22)" : "transparent",
    color: active ? "#fb923c" : "#cbd5e1",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxSizing: "border-box",
    borderLeft: active ? "3px solid #FA8112" : "3px solid transparent",
  };
}

function techSidebarInitial(user) {
  if (!user) return "T";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "T";
}

const techSectionLabelStyle = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#94a3b8",
  padding: "0 16px",
  marginTop: "20px",
  marginBottom: "8px",
};

function TechnicianAppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0 });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordOtpCode, setPasswordOtpCode] = useState("");
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordState, setPasswordState] = useState({ busy: false, message: "", error: "" });
  const [profileUser, setProfileUser] = useState(() => readCampusUser());
  const [phoneDraft, setPhoneDraft] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const profileMenuTriggerRef = useRef(null);
  const profileMenuPopoverRef = useRef(null);
  const avatarFileRef = useRef(null);
  const user = readCampusUser();
  const path = location.pathname;
  const isDashboardActive = path === "/technician/tickets" || path.startsWith("/technician/tickets/");
  const isMyAssignmentActive = path === "/technician" && location.hash !== "#technician-notifications";
  const isNotificationsActive = path === "/technician" && location.hash === "#technician-notifications";

  const sidebarDisplayName = technicianWelcomeName(user);
  const sidebarEmail = (user?.email || "").trim() || "—";

  const openMyProfile = () => {
    setProfileMenuOpen(false);
    setProfileUser(readCampusUser());
    setProfileModalOpen(true);
  };

  const openChangePassword = () => {
    setProfileMenuOpen(false);
    const provider = String(user?.provider || "").toLowerCase();
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

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (profileMenuTriggerRef.current?.contains(t)) return;
      if (profileMenuPopoverRef.current?.contains(t)) return;
      setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const update = () => {
      const el = profileMenuTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setProfileMenuPos({ top: r.bottom + 8 });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [profileMenuOpen, sidebarCollapsed]);

  useEffect(() => {
    if (sidebarCollapsed) setProfileMenuOpen(false);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!profileModalOpen) return;
    const fromStorage = readCampusUser();
    setProfileUser(fromStorage);
    setPhoneDraft(phoneFromServer(fromStorage?.phoneNumber));
    setSaveState({ busy: false, message: "", error: "" });
    setAvatarBusy(false);
    setAvatarRemoveBusy(false);
    setAvatarError("");
    setAvatarSuccess("");

    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchCurrentUser();
        if (!cancelled && fresh) {
          setProfileUser(fresh);
          setPhoneDraft(phoneFromServer(fresh.phoneNumber));
          persistCampusUser(fresh);
        }
      } catch {
        // keep local cached profile
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileModalOpen]);

  const handleLogout = () => {
    persistCampusUser(null);
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/signin", { replace: true });
  };

  const canSavePhone = (() => {
    const basePhone = phoneFromServer(profileUser?.phoneNumber);
    if (!isValidProfilePhone(phoneDraft)) return false;
    return phoneDraft !== basePhone;
  })();

  const handleSavePhone = async () => {
    if (!canSavePhone) return;
    setSaveState({ busy: true, message: "", error: "" });
    try {
      const updated = await updateProfilePhone({ phoneNumber: phoneDraft });
      setProfileUser(updated);
      persistCampusUser(updated);
      setSaveState({ busy: false, message: "Changes saved.", error: "" });
    } catch (e) {
      setSaveState({ busy: false, message: "", error: e?.message || "Save failed" });
    }
  };

  const handleAvatarChange = async (e) => {
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
      setProfileUser(updated);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo saved.");
    } catch (err) {
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profileUser?.profileImageUrl) return;
    const ok = window.confirm("Remove your profile photo from CampusSync?");
    if (!ok) return;
    setAvatarError("");
    setAvatarSuccess("");
    setAvatarRemoveBusy(true);
    try {
      const updated = await removeProfileAvatar();
      setProfileUser(updated);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo removed.");
    } catch (err) {
      setAvatarError(err?.message || "Could not remove photo");
    } finally {
      setAvatarRemoveBusy(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "stretch",
        backgroundColor: "#f1f5f9",
        fontFamily: appFontFamily,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          width: sidebarCollapsed ? "56px" : "272px",
          minWidth: sidebarCollapsed ? "56px" : "272px",
          flexShrink: 0,
          alignSelf: "stretch",
          position: "sticky",
          top: 0,
          height: "100vh",
          transition: "width 0.2s ease, min-width 0.2s ease",
          background: "linear-gradient(180deg, #14213D 0%, #1a2d4d 100%)",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          borderRight: "1px solid rgba(148, 163, 184, 0.12)",
          overflow: "hidden",
        }}
      >
        {sidebarCollapsed ? (
          <div
            style={{
              padding: "14px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Open menu"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(148, 163, 184, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e2e8f0",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "22px 18px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarCollapsed(true);
              }}
              aria-label="Close menu"
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
        )}

        <nav style={{ flex: 1, padding: "4px 0" }} aria-label="Technician sections">
          {!sidebarCollapsed && <div style={techSectionLabelStyle}>MENU</div>}
          {!sidebarCollapsed && (
            <>
              <Link to="/technician/tickets" style={{ ...techSidebarNavRowStyle(isDashboardActive), textDecoration: "none", display: "block" }}>
                Dashboard
              </Link>
              <Link
                to="/technician#technician-assigned-tickets"
                style={{ ...techSidebarNavRowStyle(isMyAssignmentActive), textDecoration: "none", display: "block" }}
              >
                My Assignments
              </Link>
              <Link to="/technician#technician-notifications" style={{ ...techSidebarNavRowStyle(isNotificationsActive), textDecoration: "none", display: "block" }}>
                Notifications
              </Link>
            </>
          )}
        </nav>
      </aside>

      {profileMenuOpen ? (
        <div
          ref={profileMenuPopoverRef}
          role="menu"
          style={{
            position: "fixed",
            top: profileMenuPos.top,
            right: 12,
            width: "min(280px, calc(100vw - 24px))",
            zIndex: 10020,
            backgroundColor: "rgba(15, 23, 42, 0.08)",
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.45)",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.14)",
            padding: 14,
            boxSizing: "border-box",
            fontFamily: appFontFamily,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {techSidebarInitial(user)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", wordBreak: "break-word" }}>{sidebarDisplayName}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{sidebarEmail}</div>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={openMyProfile}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "rgba(255, 255, 255, 0.15)",
              fontWeight: 700,
              fontSize: 14,
              color: "#0f172a",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: appFontFamily,
            }}
          >
            My profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={openChangePassword}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "rgba(255, 255, 255, 0.15)",
              fontWeight: 700,
              fontSize: 14,
              color: "#0f172a",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: appFontFamily,
              marginTop: 8,
            }}
          >
            Change Password
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(248, 113, 113, 0.35)",
              background: "rgba(255, 255, 255, 0.15)",
              fontWeight: 700,
              fontSize: 14,
              color: "#b91c1c",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: appFontFamily,
              marginTop: 8,
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
      {profileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10030,
            padding: "18px",
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setProfileModalOpen(false);
          }}
        >
          <div
            style={{
              width: "min(860px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
              fontFamily: appFontFamily,
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>My profile</div>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700, marginTop: 2 }}>Personal info</div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{ border: "none", background: "transparent", fontWeight: 800, cursor: "pointer", color: "#111827" }}
              >
                Close
              </button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    backgroundColor: "#e5e7eb",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b7280",
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {profileUser?.profileImageUrl ? (
                    <img src={profileUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    (profileUser?.firstName || profileUser?.email || "T").charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ minWidth: 220, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input ref={avatarFileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={avatarBusy || avatarRemoveBusy}
                    style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontWeight: 700, cursor: "pointer" }}
                  >
                    {avatarBusy ? "Saving..." : profileUser?.profileImageUrl ? "Change photo" : "Upload photo"}
                  </button>
                  {profileUser?.profileImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={avatarBusy || avatarRemoveBusy}
                      style={{
                        padding: "9px 14px",
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        background: "#fff",
                        color: "#b91c1c",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {avatarRemoveBusy ? "Removing..." : "Remove photo"}
                    </button>
                  )}
                  {avatarSuccess && <div style={{ color: "#059669", fontSize: 12, width: "100%" }}>{avatarSuccess}</div>}
                  {avatarError && <div style={{ color: "#b91c1c", fontSize: 12, width: "100%" }}>{avatarError}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#374151" }}>Email</label>
                  <input
                    readOnly
                    disabled
                    value={profileUser?.email || ""}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#374151" }}>Phone number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={PROFILE_PHONE_DIGITS}
                    value={phoneDraft}
                    onChange={(e) => {
                      setPhoneDraft(sanitizeProfilePhoneInput(e.target.value));
                      setSaveState((s) => ({ ...s, message: "", error: "" }));
                    }}
                    placeholder="0771234567"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#6b7280" }}>
                    {PROFILE_PHONE_DIGITS} digits only (no letters).
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#374151" }}>First name</label>
                  <input
                    readOnly
                    disabled
                    value={profileUser?.firstName || ""}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#374151" }}>Last name</label>
                  <input
                    readOnly
                    disabled
                    value={profileUser?.lastName || ""}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                {saveState.message && <span style={{ fontSize: 13, color: "#059669" }}>{saveState.message}</span>}
                {saveState.error && <span style={{ fontSize: 13, color: "#b91c1c" }}>{saveState.error}</span>}
                <button
                  type="button"
                  onClick={handleSavePhone}
                  disabled={!canSavePhone || saveState.busy}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: canSavePhone && !saveState.busy ? "#FA8112" : "#d1d5db",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: canSavePhone && !saveState.busy ? "pointer" : "not-allowed",
                  }}
                >
                  {saveState.busy ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {passwordModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 10040, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPasswordModalOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "520px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Change Password</div>
              <button type="button" onClick={() => setPasswordModalOpen(false)} style={{ border: "none", background: "transparent", fontWeight: 800, cursor: "pointer", color: "#0f172a" }}>Close</button>
            </div>
            <div style={{ padding: "18px", display: "grid", gap: "12px" }}>
              <div><label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Current password</label><PasswordInput value={passwordDraft.currentPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, currentPassword: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }} /></div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>New password</label>
                <PasswordInput value={passwordDraft.newPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, newPassword: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                  <div style={{ color: passwordChecks.minLength ? "#15803d" : "#6b7280" }}>Password must be at least 8 characters</div>
                  <div style={{ color: passwordChecks.hasComplexity ? "#15803d" : "#6b7280" }}>Must include uppercase, lowercase, number, symbol</div>
                  <div style={{ color: (passwordDraft.newPassword && passwordDraft.newPassword === passwordDraft.currentPassword) ? "#b91c1c" : "#6b7280" }}>New password must be different from current password</div>
                </div>
              </div>
              <div><label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Confirm new password</label><PasswordInput value={passwordDraft.confirmPassword} onChange={(e) => setPasswordDraft((s) => ({ ...s, confirmPassword: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }} /></div>
              {passwordOtpSent && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={passwordOtpCode}
                    onChange={(e) => setPasswordOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
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
                    borderRadius: 10,
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
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header
          style={{
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "12px 24px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
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
          <button
            type="button"
            ref={profileMenuTriggerRef}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            aria-label="Profile menu"
            onClick={(e) => {
              e.stopPropagation();
              setProfileMenuOpen((o) => !o);
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#475569",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {techSidebarInitial(user)}
          </button>
        </header>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "clamp(16px, 3vw, 28px) clamp(14px, 3vw, 24px)",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function TechnicianTicketDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const campusUser = useMemo(() => readCampusUser(), []);
  const isTechnician = String(campusUser?.role || "").toUpperCase() === "TECHNICIAN";
  const welcomeName = technicianWelcomeName(campusUser);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/signin", { replace: true, state: { from: "/technician/tickets" } });
      return;
    }
    if (!isTechnician) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getTechnicianAssignedTickets();
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load assigned tickets.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, isTechnician]);

  const dashboardStats = useMemo(() => {
    const data = Array.isArray(tickets) ? tickets : [];
    const total = data.length;
    const statusCounts = {
      OPEN: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      REJECTED: 0,
      OTHER: 0,
    };
    const priorityCounts = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      OTHER: 0,
    };

    data.forEach((ticket) => {
      const status = (ticket.status || "").toUpperCase();
      const priority = (ticket.priority || "").toUpperCase();

      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      else statusCounts.OTHER += 1;

      if (priorityCounts[priority] !== undefined) priorityCounts[priority] += 1;
      else priorityCounts.OTHER += 1;
    });

    return { total, statusCounts, priorityCounts };
  }, [tickets]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    for (const t of Array.isArray(tickets) ? tickets : []) {
      const c = (t.category || "Uncategorized").trim() || "Uncategorized";
      map[c] = (map[c] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name: name.length > 34 ? `${name.slice(0, 32)}…` : name,
        count,
      }));
  }, [tickets]);

  const locationBreakdown = useMemo(() => {
    const map = {};
    for (const t of Array.isArray(tickets) ? tickets : []) {
      const loc = (t.resourceLocation || "").trim() || "Not specified";
      map[loc] = (map[loc] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({
        name: name.length > 30 ? `${name.slice(0, 28)}…` : name,
        count,
      }));
  }, [tickets]);

  const maxCategoryCount = Math.max(1, ...categoryBreakdown.map((x) => x.count));
  const maxLocationCount = Math.max(1, ...locationBreakdown.map((x) => x.count));

  const maxPriorityCount = Math.max(
    1,
    dashboardStats.priorityCounts.HIGH,
    dashboardStats.priorityCounts.MEDIUM,
    dashboardStats.priorityCounts.LOW,
    dashboardStats.priorityCounts.OTHER
  );

  const inProgressCount = dashboardStats.statusCounts.IN_PROGRESS;
  const acceptedCount = dashboardStats.statusCounts.ACCEPTED;

  /** Count per local calendar day — last 7 days; uses `technicianAssignedAt` when set, else `createdAt`. */
  const last7DaysBars = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(today.getDate() - i);
      const key = localCalendarDayKey(d.getTime());
      if (!key) continue;
      days.push({
        key,
        shortLabel: d.toLocaleDateString(undefined, { weekday: "short" }),
        count: 0,
      });
    }
    const map = Object.fromEntries(days.map((x) => [x.key, x]));
    for (const t of Array.isArray(tickets) ? tickets : []) {
      const key = volumeDayKeyForAssignedTicket(t);
      if (key && map[key]) map[key].count += 1;
    }
    return days;
  }, [tickets]);

  const maxDayBarCount = Math.max(1, ...last7DaysBars.map((d) => d.count));

  const statusPieGradient = useMemo(() => {
    if (dashboardStats.total === 0) {
      return "conic-gradient(#E5E5E5 0 100%)";
    }
    const total = dashboardStats.total || 1;
    const parts = [
      { color: "#14213D", count: dashboardStats.statusCounts.OPEN },
      { color: "#FCA311", count: dashboardStats.statusCounts.ACCEPTED },
      { color: "#FA8112", count: dashboardStats.statusCounts.IN_PROGRESS },
      { color: "#2e7d32", count: dashboardStats.statusCounts.RESOLVED },
      { color: "#d32f2f", count: dashboardStats.statusCounts.REJECTED },
    ];
    let current = 0;
    const stops = parts
      .filter((p) => p.count > 0)
      .map((p) => {
        const pct = (p.count / total) * 100;
        const start = current;
        current += pct;
        return `${p.color} ${start}% ${current}%`;
      })
      .join(", ");
    return stops ? `conic-gradient(${stops})` : "conic-gradient(#E5E5E5 0 100%)";
  }, [dashboardStats]);

  if (!isTechnician && campusUser) {
    return null;
  }

  return (
    <TechnicianAppShell>
      <div style={{ ...shellStyle, width: "100%", maxWidth: "1180px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #E8E4DC",
          }}
        >
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#14213D" }}>
              Ticket dashboard
            </h1>
          </div>
        </div>

        {error ? (
          <p style={{ color: "#c62828", fontWeight: 700, fontSize: "14px" }}>{error}</p>
        ) : null}

        {loading ? (
          <p style={{ color: "#6b7280", fontWeight: 600 }}>Loading your ticket analytics…</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E8E4DC",
                borderLeft: "4px solid #FA8112",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(20, 33, 61, 0.04)",
              }}
            >
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                <span style={{ fontSize: "clamp(17px, 2.1vw, 22px)", fontWeight: 800, color: "#14213D" }}>
                  Welcome back, {welcomeName}.
                </span>
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                width: "100%",
              }}
            >
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #14213D" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Assigned total</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.total}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #FA8112" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>In progress</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{inProgressCount}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #FCA311" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Accepted</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{acceptedCount}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #2e7d32" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Resolved</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.statusCounts.RESOLVED}</div>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                alignItems: "stretch",
              }}
            >
              <div style={{ ...chartCardStyle, minWidth: 0 }}>
                <div style={sectionTitleStyle}>Ticket volume by day</div>
                <p style={{ margin: "0 0 14px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  How many tickets landed in your queue each day (last 7 days), using assignment time when available,
                  otherwise report time.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: "8px",
                    minHeight: "200px",
                    padding: "8px 4px 4px",
                    borderBottom: "2px solid #E8E4DC",
                  }}
                >
                  {last7DaysBars.map((day, index) => (
                    <div
                      key={day.key}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "6px",
                        minWidth: 0,
                      }}
                    >
                      <div style={{ color: "#14213D", fontSize: "13px", fontWeight: 800 }}>{day.count}</div>
                      <div
                        title={`${day.count} ticket(s)`}
                        style={{
                          width: "100%",
                          maxWidth: "36px",
                          height: `${Math.max(10, (day.count / maxDayBarCount) * 140)}px`,
                          borderRadius: "8px 8px 0 0",
                          backgroundColor: index === last7DaysBars.length - 1 ? "#FA8112" : "#14213D",
                          transition: "height 0.2s ease",
                        }}
                      />
                      <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
                        {day.shortLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...chartCardStyle, minWidth: 0 }}>
                <div style={sectionTitleStyle}>Your tickets by status</div>
                <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Share of each status across tickets assigned to you.
                </p>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "220px" }}>
                  <div
                    style={{
                      width: "220px",
                      height: "220px",
                      borderRadius: "50%",
                      background: statusPieGradient,
                      border: "1px solid #E8E4DC",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        width: "96px",
                        height: "96px",
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        border: "1px solid #E8E4DC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700 }}>TOTAL</div>
                      <div style={{ color: "#14213D", fontSize: "24px", fontWeight: 800, lineHeight: 1 }}>{dashboardStats.total}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                width: "100%",
                alignItems: "stretch",
              }}
            >
              <div style={chartCardStyle}>
                <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Priority breakdown</div>
                <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  How urgent your assignments are.
                </p>
                {[
                  ["HIGH", dashboardStats.priorityCounts.HIGH, "#d32f2f"],
                  ["MEDIUM", dashboardStats.priorityCounts.MEDIUM, "#FCA311"],
                  ["LOW", dashboardStats.priorityCounts.LOW, "#2e7d32"],
                ].map(([label, count, color]) => (
                  <div key={label} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700 }}>
                      <span>{label}</span>
                      <span>{count}</span>
                    </div>
                    <div style={{ height: "12px", borderRadius: "999px", border: "1px solid #E8E4DC", backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(Number(count) / maxPriorityCount) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={chartCardStyle}>
                <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>By issue category</div>
                <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Types of work assigned to you (electrical, maintenance, etc.).
                </p>
                {categoryBreakdown.length === 0 ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: 600 }}>No category data.</p>
                ) : (
                  categoryBreakdown.map((row) => (
                    <div key={row.name} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700, gap: "8px" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
                        <span style={{ flexShrink: 0 }}>{row.count}</span>
                      </div>
                      <div style={{ height: "10px", borderRadius: "999px", border: "1px solid #E8E4DC", backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(row.count / maxCategoryCount) * 100}%`,
                            backgroundColor: "#14213D",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={chartCardStyle}>
                <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>By location / resource</div>
                <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Where tickets are reported on campus (up to 12 locations).
                </p>
                {locationBreakdown.length === 0 ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: 600 }}>No location data.</p>
                ) : (
                  locationBreakdown.map((row) => (
                    <div key={row.name} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700, gap: "8px" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
                        <span style={{ flexShrink: 0 }}>{row.count}</span>
                      </div>
                      <div style={{ height: "10px", borderRadius: "999px", border: "1px solid #E8E4DC", backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(row.count / maxLocationCount) * 100}%`,
                            backgroundColor: "#FA8112",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TechnicianAppShell>
  );
}
