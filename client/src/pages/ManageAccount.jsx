import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  deleteAccount,
  fetchCurrentUser,
  removeProfileAvatar,
  updateProfilePhone,
  uploadProfileAvatar,
} from "../api/auth";
import { getAuthToken } from "../api/http";
import { ACCOUNT_PATH, rememberPostLoginPath } from "../utils/authRedirect";
import { persistCampusUser } from "../utils/campusUserStorage";
import { isValidProfilePhone, phoneFromServer, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../utils/profilePhone";

/** Same localStorage key as ContactUs.jsx uses when saving submissions. */
const CONTACT_MESSAGES_STORAGE_KEY = "smartCampusContactMessages";

function readStoredContactMessages() {
  try {
    const raw = localStorage.getItem(CONTACT_MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredContactMessages(list) {
  try {
    localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private mode */
  }
}

function formatContactSubmittedAt(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  } catch {
    return "—";
  }
}

const pageWrap = {
  minHeight: "100vh",
  display: "flex",
  backgroundColor: "#f3f4f6",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const sidebarStyle = {
  width: "268px",
  minWidth: "268px",
  backgroundColor: "#ffffff",
  borderRight: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  boxSizing: "border-box",
};

const mainStyle = {
  flex: 1,
  overflow: "auto",
  padding: "32px 40px 48px",
  boxSizing: "border-box",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
  padding: "28px 32px",
  maxWidth: "720px",
};

const inputDisabled = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  color: "#4b5563",
  fontSize: "14px",
  boxSizing: "border-box",
  cursor: "not-allowed",
  opacity: 1,
};

const inputEditable = {
  ...inputDisabled,
  backgroundColor: "#ffffff",
  color: "#111827",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#111827",
  marginBottom: "6px",
};

const readOnlyBadgeStyle = {
  marginLeft: "8px",
  fontSize: "11px",
  fontWeight: 700,
  color: "#6b7280",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

const sectionHeading = {
  fontSize: "28px",
  fontWeight: 650,
  color: "#111827",
  margin: "0 0 8px 0",
  letterSpacing: "-0.02em",
};

const subtleNote = {
  fontSize: "13px",
  color: "#6b7280",
  marginBottom: "24px",
  lineHeight: 1.5,
};

export default function ManageAccount() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "personal";

  const [accountOpen, setAccountOpen] = useState(true);
  const [activitiesOpen, setActivitiesOpen] = useState(true);
  const [profile, setProfile] = useState(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileRef = useRef(null);
  const [contactMessagesRev, setContactMessagesRev] = useState(0);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editContactDraft, setEditContactDraft] = useState(null);
  const [editContactError, setEditContactError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoadError("");
    try {
      const u = await fetchCurrentUser();
      setProfile(u);
      setPhoneDraft(phoneFromServer(u.phoneNumber));
      persistCampusUser(u);
    } catch (e) {
      setLoadError(e.message || "Could not load profile");
    }
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      rememberPostLoginPath(ACCOUNT_PATH);
      navigate("/signin", { replace: true, state: { from: ACCOUNT_PATH } });
      return;
    }
    loadProfile();
  }, [navigate, loadProfile]);

  useEffect(() => {
    if (view !== "contactMessages") {
      setEditingContactId(null);
      setEditContactDraft(null);
      setEditContactError("");
    }
  }, [view]);

  const serverPhone = phoneFromServer(profile?.phoneNumber);
  const roleText = useMemo(() => {
    const role = String(profile?.role || "").trim().toUpperCase();
    return role || "USER";
  }, [profile]);
  const providerText = useMemo(() => {
    const provider = String(profile?.provider || "").trim().toLowerCase();
    if (provider.includes("google")) return "Google OAuth";
    if (provider.includes("email")) return "Email";
    if (profile?.googleSubject) return "Google OAuth";
    return "Email";
  }, [profile]);
  const canSave = useMemo(() => {
    if (!profile) return false;
    if (!isValidProfilePhone(phoneDraft)) return false;
    return phoneDraft !== serverPhone;
  }, [profile, phoneDraft, serverPhone]);

  const isAdminAccount = roleText === "ADMIN";

  const storedContactMessages = useMemo(() => {
    if (view !== "contactMessages") return [];
    const myEmail = (profile?.email || "").trim().toLowerCase();
    if (!myEmail) return [];
    return readStoredContactMessages().filter(
      (m) => (m?.email || "").trim().toLowerCase() === myEmail
    );
  }, [view, profile?.email, contactMessagesRev]);

  const bumpContactMessages = () => setContactMessagesRev((n) => n + 1);

  const startEditContact = (msg) => {
    if (!msg?.id) return;
    setEditContactError("");
    setEditingContactId(msg.id);
    setEditContactDraft({
      firstName: msg.firstName || "",
      lastName: msg.lastName || "",
      phone: msg.phone || "",
      subject: msg.subject || "",
      message: msg.message || "",
    });
  };

  const cancelEditContact = () => {
    setEditingContactId(null);
    setEditContactDraft(null);
    setEditContactError("");
  };

  const saveEditContact = (msgId) => {
    if (!editContactDraft || !msgId) return;
    const subject = editContactDraft.subject.trim();
    const message = editContactDraft.message.trim();
    if (!subject || !message) {
      setEditContactError("Subject and message are required.");
      return;
    }
    const myEmail = (profile?.email || "").trim().toLowerCase();
    if (!myEmail) return;
    const all = readStoredContactMessages();
    const idx = all.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const existing = all[idx];
    if ((existing?.email || "").trim().toLowerCase() !== myEmail) return;
    const updated = {
      ...existing,
      firstName: editContactDraft.firstName.trim(),
      lastName: editContactDraft.lastName.trim(),
      phone: editContactDraft.phone.trim(),
      subject,
      message,
      lastEditedAt: new Date().toISOString(),
    };
    const next = [...all.slice(0, idx), updated, ...all.slice(idx + 1)];
    writeStoredContactMessages(next);
    cancelEditContact();
    bumpContactMessages();
  };

  const deleteContactMessage = (msgId) => {
    if (!msgId) return;
    const ok = window.confirm("Delete this contact message? This cannot be undone.");
    if (!ok) return;
    const myEmail = (profile?.email || "").trim().toLowerCase();
    if (!myEmail) return;
    const all = readStoredContactMessages();
    const target = all.find((m) => m.id === msgId);
    if (!target || (target?.email || "").trim().toLowerCase() !== myEmail) return;
    writeStoredContactMessages(all.filter((m) => m.id !== msgId));
    if (editingContactId === msgId) cancelEditContact();
    bumpContactMessages();
  };

  const contactEditInputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  };

  const setView = (next) => {
    setSearchParams(next === "personal" ? {} : { view: next });
  };

  const handleSavePhone = async () => {
    if (!canSave) return;
    setSaveState({ busy: true, message: "", error: "" });
    try {
      const updated = await updateProfilePhone({ phoneNumber: phoneDraft });
      setProfile(updated);
      persistCampusUser(updated);
      setSaveState({ busy: false, message: "Changes saved.", error: "" });
    } catch (e) {
      setSaveState({ busy: false, message: "", error: e.message || "Save failed" });
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
      setProfile(updated);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo saved.");
    } catch (err) {
      setAvatarError(err.message || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.profileImageUrl) return;
    const ok = window.confirm("Remove your profile photo from CampusSync?");
    if (!ok) return;
    setAvatarError("");
    setAvatarSuccess("");
    setAvatarRemoveBusy(true);
    try {
      const updated = await removeProfileAvatar();
      setProfile(updated);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo removed.");
    } catch (err) {
      setAvatarError(err.message || "Could not remove photo");
    } finally {
      setAvatarRemoveBusy(false);
    }
  };

  const handleLogout = () => {
    persistCampusUser(null);
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/", { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (isAdminAccount) {
      window.alert(
        "Administrator accounts cannot be deleted from your profile. Another administrator can manage user access from User Management."
      );
      return;
    }
    const ok = window.confirm(
      "Delete your CampusSync account? This cannot be undone. Your tickets and related data will be removed."
    );
    if (!ok) return;
    setDeleteBusy(true);
    try {
      await deleteAccount();
      persistCampusUser(null);
      localStorage.removeItem("smartCampusAuthToken");
      navigate("/", { replace: true });
    } catch (e) {
      window.alert(e.message || "Could not delete account");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const navItem = (active) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 12px 10px 14px",
    margin: "2px 0",
    border: "none",
    borderRadius: "6px",
    background: active ? "#ecfdf5" : "transparent",
    borderLeft: active ? "3px solid #059669" : "3px solid transparent",
    color: "#111827",
    fontSize: "14px",
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
  });

  const sectionBtn = (open) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "12px 14px",
    border: "none",
    background: "transparent",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#6b7280",
    cursor: "pointer",
    textTransform: "uppercase",
  });

  if (!getAuthToken()) {
    return null;
  }

  return (
    <div style={pageWrap}>
      <aside style={sidebarStyle}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #FA8112, #F5E7C6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              C
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>CampusSync</div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>Account</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "8px 8px 0", flex: 1, overflow: "auto" }}>
          <button
            type="button"
            style={sectionBtn(accountOpen)}
            onClick={() => setAccountOpen((o) => !o)}
            aria-expanded={accountOpen}
          >
            Account
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{accountOpen ? "▼" : "▶"}</span>
          </button>
          {accountOpen && (
            <div style={{ padding: "0 4px 8px" }}>
              <button
                type="button"
                style={navItem(view === "personal")}
                onClick={() => setView("personal")}
              >
                Personal info
              </button>
            </div>
          )}

          <button
            type="button"
            style={sectionBtn(activitiesOpen)}
            onClick={() => setActivitiesOpen((o) => !o)}
            aria-expanded={activitiesOpen}
          >
            Activities
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{activitiesOpen ? "▼" : "▶"}</span>
          </button>
          {activitiesOpen && (
            <div style={{ padding: "0 4px 8px" }}>
              <button
                type="button"
                style={navItem(false)}
                onClick={() => navigate("/my-tickets")}
              >
                My tickets
              </button>
              <button type="button" style={navItem(view === "bookings")} onClick={() => setView("bookings")}>
                My bookings
              </button>
              <button
                type="button"
                style={navItem(view === "contactMessages")}
                onClick={() => setView("contactMessages")}
              >
                My contact message
              </button>
              <button
                type="button"
                style={navItem(view === "notifications")}
                onClick={() => setView("notifications")}
              >
                Notifications
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px 8px", borderTop: "1px solid #f3f4f6" }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              fontWeight: 600,
              fontSize: "14px",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
        <div style={{ padding: "8px 16px 20px" }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              width: "100%",
              padding: "8px 14px",
              border: "none",
              background: "transparent",
              fontSize: "14px",
              fontWeight: 500,
              color: "#6b7280",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            ← Back
          </button>
        </div>
      </aside>

      <main style={mainStyle}>
        {view === "personal" && (
          <>
            <h1 style={sectionHeading}>Personal info</h1>
            <p style={subtleNote}>
              Update your campus profile. Your email and name come from your account provider and cannot be changed
              here.
            </p>

            {loadError && (
              <p style={{ color: "#b91c1c", marginBottom: "16px" }}>{loadError}</p>
            )}

            {!profile && !loadError && <p style={{ color: "#6b7280" }}>Loading…</p>}

            {profile && (
              <>
                <div style={{ ...cardStyle, marginBottom: "20px" }}>
                  <h2 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                    Profile photo
                  </h2>
                 
                  <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: "96px",
                        height: "96px",
                        borderRadius: "50%",
                        backgroundColor: "#e5e7eb",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        fontSize: "32px",
                        fontWeight: 700,
                      }}
                    >
                      {profile.profileImageUrl ? (
                        <img
                          src={profile.profileImageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        (profile.firstName || profile.email || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: "1", minWidth: "200px" }}>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                        <button
                          type="button"
                          disabled={avatarBusy || avatarRemoveBusy}
                          onClick={() => fileRef.current?.click()}
                          style={{
                            padding: "10px 18px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                          }}
                        >
                          {avatarBusy
                            ? "Saving…"
                            : profile.profileImageUrl
                              ? "Change profile photo"
                              : "Upload profile photo"}
                        </button>
                        {profile.profileImageUrl && (
                          <button
                            type="button"
                            disabled={avatarBusy || avatarRemoveBusy}
                            onClick={handleRemoveAvatar}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid #fecaca",
                              background: "#fff",
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "#b91c1c",
                              cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                            }}
                          >
                            {avatarRemoveBusy ? "Removing…" : "Remove photo"}
                          </button>
                        )}
                      </div>
                      {avatarSuccess && (
                        <p style={{ color: "#059669", fontSize: "13px", marginTop: "10px", marginBottom: 0 }}>
                          {avatarSuccess}
                        </p>
                      )}
                      {avatarError && (
                        <p style={{ color: "#b91c1c", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>
                          {avatarError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ ...cardStyle, marginBottom: "20px" }}>
                  <div style={{ marginBottom: "18px" }}>
                    <label style={labelStyle}>
                      Email address <span style={readOnlyBadgeStyle}>Read-only</span>
                    </label>
                    <input type="email" readOnly disabled value={profile.email || ""} style={inputDisabled} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                    <div>
                      <label style={labelStyle}>
                        First name <span style={readOnlyBadgeStyle}>Read-only</span>
                      </label>
                      <input readOnly disabled value={profile.firstName || ""} style={inputDisabled} />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Last name <span style={readOnlyBadgeStyle}>Read-only</span>
                      </label>
                      <input readOnly disabled value={profile.lastName || ""} style={inputDisabled} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                    <div>
                      <label style={labelStyle}>
                        Role <span style={readOnlyBadgeStyle}>Read-only</span>
                      </label>
                      <input readOnly disabled value={roleText} style={inputDisabled} />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Login Provider <span style={readOnlyBadgeStyle}>Read-only</span>
                      </label>
                      <input readOnly disabled value={providerText} style={inputDisabled} />
                    </div>
                  </div>
                  {providerText === "Google OAuth" && (
                    <p
                      style={{
                        margin: "0 0 18px 0",
                        fontSize: "13px",
                        color: "#1f2937",
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        lineHeight: 1.45,
                      }}
                    >
                      This account uses Google sign-in. Some identity fields are managed by Google.
                    </p>
                  )}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={labelStyle}>Phone number</label>
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
                      style={inputEditable}
                      autoComplete="tel"
                    />
                    <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px", marginBottom: 0 }}>
                      {PROFILE_PHONE_DIGITS} digits only (no letters). Enter a full mobile number to save.
                    </p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
                    {saveState.message && (
                      <span style={{ fontSize: "14px", color: "#059669" }}>{saveState.message}</span>
                    )}
                    {saveState.error && (
                      <span style={{ fontSize: "14px", color: "#b91c1c" }}>{saveState.error}</span>
                    )}
                    <button
                      type="button"
                      disabled={!canSave || saveState.busy}
                      onClick={handleSavePhone}
                      style={{
                        padding: "10px 22px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: canSave && !saveState.busy ? "#FA8112" : "#d1d5db",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: canSave && !saveState.busy ? "pointer" : "not-allowed",
                      }}
                    >
                      {saveState.busy ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>

                {!isAdminAccount && (
                  <div style={cardStyle}>
                    <h2 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                      Delete account
                    </h2>
                    <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px", lineHeight: 1.5 }}>
                      You will lose access to your CampusSync account once your deletion request is confirmed. Your
                      tickets and comments you created will be removed.
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        disabled={deleteBusy}
                        onClick={handleDeleteAccount}
                        style={{
                          padding: "10px 20px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "#dc2626",
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: deleteBusy ? "wait" : "pointer",
                        }}
                      >
                        {deleteBusy ? "Deleting…" : "Delete account"}
                      </button>
                    </div>
                  </div>
                )}
                {isAdminAccount && (
                  <div
                    style={{
                      ...cardStyle,
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <h2 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                      Account removal
                    </h2>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                      Administrator accounts cannot be deleted from this page. Use User Management to adjust other
                      accounts, or contact support if an admin account must be retired.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === "bookings" && (
          <>
            <h1 style={sectionHeading}>My bookings</h1>
            <p style={subtleNote}>Room and resource bookings will appear here in a future update.</p>
            <div style={cardStyle}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No bookings yet.</p>
            </div>
          </>
        )}

        {view === "contactMessages" && (
          <>
            <h1 style={sectionHeading}>My contact messages</h1>
            <p style={subtleNote}>
              Only contact messages submitted with the same email address as this account are shown (this browser’s
              saved submissions, filtered by your profile email).
            </p>
            {storedContactMessages.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No submitted contact messages yet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {storedContactMessages.map((msg) => {
                  const isEditing = editingContactId === msg.id;
                  const anotherEditing = editingContactId !== null && editingContactId !== msg.id;
                  return (
                    <div key={msg.id || `${msg.submittedAt}-${msg.subject}`} style={cardStyle}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "10px",
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
                            {isEditing ? editContactDraft?.subject : msg.subject || "—"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                            Reference: {msg.id || "—"} · Submitted: {formatContactSubmittedAt(msg.submittedAt)}
                            {msg.lastEditedAt ? ` · Updated: ${formatContactSubmittedAt(msg.lastEditedAt)}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "#166534",
                              backgroundColor: "#dcfce7",
                              padding: "4px 10px",
                              borderRadius: "999px",
                            }}
                          >
                            {msg.status || "Submitted"}
                          </span>
                          {msg.id ? (
                            <>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => saveEditContact(msg.id)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      border: "none",
                                      backgroundColor: "#FA8112",
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: "13px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditContact}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      border: "1px solid #d1d5db",
                                      backgroundColor: "#fff",
                                      fontWeight: 600,
                                      fontSize: "13px",
                                      cursor: "pointer",
                                      color: "#374151",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={anotherEditing}
                                    onClick={() => startEditContact(msg)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      border: "none",
                                      backgroundColor: "#FA8112",
                                      fontWeight: 700,
                                      fontSize: "13px",
                                      cursor: anotherEditing ? "not-allowed" : "pointer",
                                      color: "#ffffff",
                                      opacity: anotherEditing ? 0.5 : 1,
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={anotherEditing}
                                    onClick={() => deleteContactMessage(msg.id)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "8px",
                                      border: "none",
                                      backgroundColor: "#dc2626",
                                      color: "#fff",
                                      fontWeight: 700,
                                      fontSize: "13px",
                                      cursor: anotherEditing ? "not-allowed" : "pointer",
                                      opacity: anotherEditing ? 0.5 : 1,
                                    }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                      {isEditing && editContactDraft ? (
                        <div style={{ display: "grid", gap: "12px", fontSize: "14px", color: "#374151" }}>
                          {editContactError ? (
                            <div
                              style={{
                                padding: "10px 12px",
                                borderRadius: "8px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#b91c1c",
                                fontWeight: 600,
                                fontSize: "13px",
                              }}
                            >
                              {editContactError}
                            </div>
                          ) : null}
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "12px" }}>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                                FIRST NAME
                              </div>
                              <input
                                type="text"
                                value={editContactDraft.firstName}
                                onChange={(e) =>
                                  setEditContactDraft((d) => (d ? { ...d, firstName: e.target.value } : d))
                                }
                                style={contactEditInputStyle}
                              />
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                                LAST NAME
                              </div>
                              <input
                                type="text"
                                value={editContactDraft.lastName}
                                onChange={(e) =>
                                  setEditContactDraft((d) => (d ? { ...d, lastName: e.target.value } : d))
                                }
                                style={contactEditInputStyle}
                              />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                              EMAIL (read-only)
                            </div>
                            <input type="email" readOnly disabled value={msg.email || ""} style={{ ...contactEditInputStyle, backgroundColor: "#f9fafb", color: "#6b7280" }} />
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                              PHONE
                            </div>
                            <input
                              type="tel"
                              value={editContactDraft.phone}
                              onChange={(e) =>
                                setEditContactDraft((d) => (d ? { ...d, phone: e.target.value } : d))
                              }
                              style={contactEditInputStyle}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                              SUBJECT
                            </div>
                            <input
                              type="text"
                              value={editContactDraft.subject}
                              onChange={(e) =>
                                setEditContactDraft((d) => (d ? { ...d, subject: e.target.value } : d))
                              }
                              style={contactEditInputStyle}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                              MESSAGE
                            </div>
                            <textarea
                              value={editContactDraft.message}
                              onChange={(e) =>
                                setEditContactDraft((d) => (d ? { ...d, message: e.target.value } : d))
                              }
                              rows={6}
                              style={{ ...contactEditInputStyle, resize: "vertical", minHeight: "120px" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: "12px", fontSize: "14px", color: "#374151" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "12px" }}>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>
                                FROM
                              </div>
                              <div style={{ fontWeight: 600 }}>
                                {[msg.firstName, msg.lastName].filter(Boolean).join(" ").trim() || "—"}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>
                                EMAIL
                              </div>
                              <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{msg.email || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>
                                PHONE
                              </div>
                              <div style={{ fontWeight: 600 }}>{msg.phone || "—"}</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                              MESSAGE
                            </div>
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5,
                                padding: "12px 14px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                                color: "#1f2937",
                              }}
                            >
                              {msg.message || "—"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {view === "notifications" && (
          <>
            <h1 style={sectionHeading}>Notifications</h1>
            <p style={subtleNote}>Campus notifications and alerts will appear here in a future update.</p>
            <div style={cardStyle}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>You have no notifications.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
