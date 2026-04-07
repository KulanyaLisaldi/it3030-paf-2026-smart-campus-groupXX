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
import {
  ERR_LONG_TEXT_CHARS,
  ERR_NAME_CHARS,
  ERR_PHONE_CHARS,
  ERR_SAME_CHAR_RUN,
  ERR_SUBJECT_CHARS,
  hasExcessiveConsecutiveSameChar,
  longTextCharsValid,
  nameCharsValid,
  phoneCharsValid,
  subjectCharsValid,
} from "../utils/contactMessageValidation";
import { cancelMyBooking, getMyBookings } from "../api/bookings";

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

const EDIT_CONTACT_MAX_NAME = 80;
const EDIT_CONTACT_MIN_SUBJECT = 3;
const EDIT_CONTACT_MAX_SUBJECT = 200;
const EDIT_CONTACT_MIN_MESSAGE = 10;
const EDIT_CONTACT_MAX_MESSAGE = 4000;

function isValidOptionalContactPhoneEdit(phoneTrimmed) {
  if (!phoneTrimmed) return true;
  const digits = phoneTrimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && phoneTrimmed.length <= 24;
}

function validateContactMessageEditDraft(draft) {
  if (!draft) return "Nothing to save.";
  const firstName = (draft.firstName || "").trim();
  const lastName = (draft.lastName || "").trim();
  const phone = (draft.phone || "").trim();
  const subject = (draft.subject || "").trim();
  const message = (draft.message || "").trim();
  if (!firstName) return "First name is required.";
  if (!nameCharsValid(firstName)) return ERR_NAME_CHARS;
  if (hasExcessiveConsecutiveSameChar(firstName)) return ERR_SAME_CHAR_RUN;
  if (firstName.length > EDIT_CONTACT_MAX_NAME) return `First name must be at most ${EDIT_CONTACT_MAX_NAME} characters.`;
  if (!nameCharsValid(lastName)) return ERR_NAME_CHARS;
  if (lastName && hasExcessiveConsecutiveSameChar(lastName)) return ERR_SAME_CHAR_RUN;
  if (lastName.length > EDIT_CONTACT_MAX_NAME) return `Last name must be at most ${EDIT_CONTACT_MAX_NAME} characters.`;
  if (!phoneCharsValid(phone)) return ERR_PHONE_CHARS;
  if (!isValidOptionalContactPhoneEdit(phone)) return "Enter a valid phone number, or leave phone blank.";
  if (!subject) return "Subject is required.";
  if (!subjectCharsValid(subject)) return ERR_SUBJECT_CHARS;
  if (hasExcessiveConsecutiveSameChar(subject)) return ERR_SAME_CHAR_RUN;
  if (subject.length < EDIT_CONTACT_MIN_SUBJECT)
    return `Subject must be at least ${EDIT_CONTACT_MIN_SUBJECT} characters.`;
  if (subject.length > EDIT_CONTACT_MAX_SUBJECT)
    return `Subject must be at most ${EDIT_CONTACT_MAX_SUBJECT} characters.`;
  if (!message) return "Message is required.";
  if (!longTextCharsValid(message)) return ERR_LONG_TEXT_CHARS;
  if (hasExcessiveConsecutiveSameChar(message)) return ERR_SAME_CHAR_RUN;
  if (message.length < EDIT_CONTACT_MIN_MESSAGE)
    return `Message must be at least ${EDIT_CONTACT_MIN_MESSAGE} characters.`;
  if (message.length > EDIT_CONTACT_MAX_MESSAGE)
    return `Message must be at most ${EDIT_CONTACT_MAX_MESSAGE} characters.`;
  return "";
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

const bookingCardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
  padding: "18px 20px",
};

const bookingChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

function bookingStatusChip(statusRaw) {
  const status = String(statusRaw || "PENDING").toUpperCase();
  if (status === "APPROVED") return { backgroundColor: "#dcfce7", color: "#166534" };
  if (status === "REJECTED") return { backgroundColor: "#fee2e2", color: "#b91c1c" };
  if (status === "CANCELLED") return { backgroundColor: "#e5e7eb", color: "#374151" };
  return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
}

function formatBookingDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatBookingDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function durationHours(start, end) {
  const [sh, sm] = String(start || "").split(":").map(Number);
  const [eh, em] = String(end || "").split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return "—";
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) return "—";
  return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} h`;
}

function canCancelBooking(statusRaw) {
  const status = String(statusRaw || "").toUpperCase();
  return status === "PENDING" || status === "APPROVED";
}

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
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [detailBooking, setDetailBooking] = useState(null);
  const [cancelBusyId, setCancelBusyId] = useState("");
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");

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

  useEffect(() => {
    if (view !== "bookings") return;
    const loadBookings = async () => {
      setBookingsLoading(true);
      setBookingsError("");
      try {
        const data = await getMyBookings();
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        setBookings([]);
        setBookingsError(e?.message || "Could not load bookings.");
      } finally {
        setBookingsLoading(false);
      }
    };
    void loadBookings();
  }, [view]);

  useEffect(() => {
    if (view !== "contactMessages") return;
    const reload = () => setContactMessagesRev((n) => n + 1);
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
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
    const validationMsg = validateContactMessageEditDraft(editContactDraft);
    if (validationMsg) {
      setEditContactError(validationMsg);
      return;
    }
    const subject = editContactDraft.subject.trim();
    const message = editContactDraft.message.trim();
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

  const handleCancelBooking = async (booking) => {
    if (!booking?.id || !canCancelBooking(booking.status)) return;
    const reason = (cancelReasonDraft || "").trim();
    if (!reason) {
      setCancelReasonError("Cancellation reason is required.");
      return;
    }
    setCancelBusyId(booking.id);
    try {
      const response = await cancelMyBooking(booking.id, reason);
      const updated = response?.booking;
      if (updated?.id) {
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        if (detailBooking?.id === updated.id) setDetailBooking(updated);
      }
      setCancelBookingTarget(null);
      setCancelReasonDraft("");
      setCancelReasonError("");
    } catch (e) {
      setCancelReasonError(e?.message || "Could not cancel booking");
    } finally {
      setCancelBusyId("");
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
            <p style={subtleNote}>You can view only your own bookings and cancel pending/approved requests.</p>
            {bookingsLoading && (
              <div style={cardStyle}>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>Loading bookings...</p>
              </div>
            )}
            {!bookingsLoading && bookingsError && (
              <div style={cardStyle}>
                <p style={{ margin: 0, color: "#b91c1c", fontSize: "15px", fontWeight: 700 }}>{bookingsError}</p>
              </div>
            )}
            {!bookingsLoading && !bookingsError && bookings.length === 0 && (
              <div style={cardStyle}>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No bookings yet.</p>
              </div>
            )}
            {!bookingsLoading && !bookingsError && bookings.length > 0 && (
              <div style={{ display: "grid", gap: "14px", maxWidth: "980px" }}>
                {bookings.map((booking) => (
                  <article key={booking.id || `${booking.resourceId}-${booking.bookingDate}-${booking.startTime}`} style={{ ...bookingCardStyle, border: "1px solid #F5E7C6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "10px" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: "0 0 3px 0", fontSize: "17px", fontWeight: 800, color: "#111827" }}>
                          {booking.resourceName || "Resource"}
                        </h3>
                      </div>
                      <span style={{ ...bookingChipStyle, ...bookingStatusChip(booking.status) }}>
                        {booking.status || "PENDING"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: "14px", color: "#374151" }}>
                      <div><strong>Resource Type:</strong> {booking.resourceType || "—"}</div>
                      <div><strong>Date:</strong> {formatBookingDate(booking.bookingDate)}</div>
                      <div><strong>Time Range:</strong> {booking.startTime || "—"} - {booking.endTime || "—"}</div>
                      <div><strong>Status:</strong> {booking.status || "PENDING"}</div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setDetailBooking(booking)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          backgroundColor: "#fff",
                          color: "#374151",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        disabled={!canCancelBooking(booking.status) || cancelBusyId === booking.id}
                        onClick={() => {
                          setCancelBookingTarget(booking);
                          setCancelReasonDraft("");
                          setCancelReasonError("");
                        }}
                        style={{
                          padding: "7px 12px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: canCancelBooking(booking.status) ? "#dc2626" : "#d1d5db",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: !canCancelBooking(booking.status) || cancelBusyId === booking.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {cancelBusyId === booking.id ? "Cancelling..." : "Cancel Booking"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {view === "bookings" && detailBooking && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setDetailBooking(null)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 1200,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "760px",
                backgroundColor: "#fff",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)",
                padding: "18px 18px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#111827" }}>Booking Details</h2>
                <button
                  type="button"
                  onClick={() => setDetailBooking(null)}
                  style={{
                    border: "1px solid #d1d5db",
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", fontSize: "14px", color: "#374151" }}>
                <div><strong>Booking ID:</strong> {detailBooking.id || "—"}</div>
                <div><strong>Resource Name:</strong> {detailBooking.resourceName || "—"}</div>
                <div><strong>Resource Type:</strong> {detailBooking.resourceType || "—"}</div>
                <div><strong>Date:</strong> {formatBookingDate(detailBooking.bookingDate)}</div>
                <div><strong>Time Range:</strong> {detailBooking.startTime || "—"} - {detailBooking.endTime || "—"}</div>
                <div><strong>Status:</strong> {detailBooking.status || "PENDING"}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {detailBooking.purpose || "—"}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Admin Reason / Comment:</strong> {detailBooking.reviewReason || detailBooking.cancellationReason || "—"}</div>
                <div><strong>Created Date:</strong> {formatBookingDateTime(detailBooking.createdAt)}</div>
                <div><strong>Total Duration:</strong> {durationHours(detailBooking.startTime, detailBooking.endTime)}</div>
              </div>
            </div>
          </div>
        )}

        {view === "bookings" && cancelBookingTarget && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => {
              if (cancelBusyId) return;
              setCancelBookingTarget(null);
              setCancelReasonDraft("");
              setCancelReasonError("");
            }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 1300,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "560px",
                backgroundColor: "#fff",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)",
                padding: "18px",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                Cancel Booking
              </h3>
              <p style={{ margin: "0 0 12px 0", color: "#374151", fontSize: "14px", lineHeight: 1.5 }}>
                Are you sure you want to cancel this booking?
              </p>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>
                Cancellation reason
              </label>
              <textarea
                value={cancelReasonDraft}
                onChange={(e) => {
                  setCancelReasonDraft(e.target.value);
                  setCancelReasonError("");
                }}
                maxLength={500}
                rows={4}
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", boxSizing: "border-box", resize: "vertical", fontSize: "14px" }}
                placeholder="Please provide the reason for cancellation..."
              />
              {cancelReasonError && (
                <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>{cancelReasonError}</p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
                <button
                  type="button"
                  disabled={!!cancelBusyId}
                  onClick={() => {
                    setCancelBookingTarget(null);
                    setCancelReasonDraft("");
                    setCancelReasonError("");
                  }}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: cancelBusyId ? "not-allowed" : "pointer" }}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={cancelBusyId === cancelBookingTarget.id}
                  onClick={() => handleCancelBooking(cancelBookingTarget)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: cancelBusyId === cancelBookingTarget.id ? "not-allowed" : "pointer" }}
                >
                  {cancelBusyId === cancelBookingTarget.id ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
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
                                maxLength={EDIT_CONTACT_MAX_NAME}
                                onChange={(e) => {
                                  setEditContactError("");
                                  setEditContactDraft((d) => (d ? { ...d, firstName: e.target.value } : d));
                                }}
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
                                maxLength={EDIT_CONTACT_MAX_NAME}
                                onChange={(e) => {
                                  setEditContactError("");
                                  setEditContactDraft((d) => (d ? { ...d, lastName: e.target.value } : d));
                                }}
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
                              onChange={(e) => {
                                setEditContactError("");
                                setEditContactDraft((d) => (d ? { ...d, phone: e.target.value } : d));
                              }}
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
                              maxLength={EDIT_CONTACT_MAX_SUBJECT}
                              onChange={(e) => {
                                setEditContactError("");
                                setEditContactDraft((d) => (d ? { ...d, subject: e.target.value } : d));
                              }}
                              style={contactEditInputStyle}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                              MESSAGE
                            </div>
                            <textarea
                              value={editContactDraft.message}
                              maxLength={EDIT_CONTACT_MAX_MESSAGE}
                              onChange={(e) => {
                                setEditContactError("");
                                setEditContactDraft((d) => (d ? { ...d, message: e.target.value } : d));
                              }}
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
                          {msg.adminReply ? (
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                                RESPONSE FROM SUPPORT
                              </div>
                              <div
                                style={{
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.5,
                                  padding: "12px 14px",
                                  backgroundColor: "#ecfdf5",
                                  borderRadius: "8px",
                                  border: "1px solid #a7f3d0",
                                  color: "#166534",
                                }}
                              >
                                {msg.adminReply}
                              </div>
                              {msg.adminRepliedAt ? (
                                <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                                  Replied: {formatContactSubmittedAt(msg.adminRepliedAt)}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
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
