import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchCurrentUser } from "../api/auth";
import { getAuthToken } from "../api/http";
import { persistCampusUser } from "../utils/campusUserStorage";
import { rememberPostLoginPath } from "../utils/authRedirect";
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
import AccountLayout from "../components/account/AccountLayout";

const CONTACT_MESSAGES_STORAGE_KEY = "smartCampusContactMessages";
const EDIT_CONTACT_MAX_NAME = 80;
const EDIT_CONTACT_MIN_SUBJECT = 3;
const EDIT_CONTACT_MAX_SUBJECT = 200;
const EDIT_CONTACT_MIN_MESSAGE = 10;
const EDIT_CONTACT_MAX_MESSAGE = 4000;

const cardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", padding: "28px 32px", maxWidth: "980px" };
const sectionHeading = { fontSize: "28px", fontWeight: 650, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" };
const subtleNote = { fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 };

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
  try { localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(list)); } catch {}
}
function formatContactSubmittedAt(iso) {
  if (!iso) return "—";
  try { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(); } catch { return "—"; }
}
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
  if (subject.length < EDIT_CONTACT_MIN_SUBJECT) return `Subject must be at least ${EDIT_CONTACT_MIN_SUBJECT} characters.`;
  if (subject.length > EDIT_CONTACT_MAX_SUBJECT) return `Subject must be at most ${EDIT_CONTACT_MAX_SUBJECT} characters.`;
  if (!message) return "Message is required.";
  if (!longTextCharsValid(message)) return ERR_LONG_TEXT_CHARS;
  if (hasExcessiveConsecutiveSameChar(message)) return ERR_SAME_CHAR_RUN;
  if (message.length < EDIT_CONTACT_MIN_MESSAGE) return `Message must be at least ${EDIT_CONTACT_MIN_MESSAGE} characters.`;
  if (message.length > EDIT_CONTACT_MAX_MESSAGE) return `Message must be at most ${EDIT_CONTACT_MAX_MESSAGE} characters.`;
  return "";
}

export default function AccountContactMessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [contactMessagesRev, setContactMessagesRev] = useState(0);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editContactDraft, setEditContactDraft] = useState(null);
  const [editContactError, setEditContactError] = useState("");

  useEffect(() => {
    if (!getAuthToken()) {
      rememberPostLoginPath(location.pathname);
      navigate("/signin", { replace: true, state: { from: location.pathname } });
      return;
    }
    const load = async () => {
      setLoadError("");
      try {
        const u = await fetchCurrentUser();
        setProfile(u);
        persistCampusUser(u);
      } catch (e) {
        setLoadError(e?.message || "Could not load profile");
      }
    };
    void load();
  }, [navigate, location.pathname]);

  useEffect(() => {
    const reload = () => setContactMessagesRev((n) => n + 1);
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);

  const storedContactMessages = useMemo(() => {
    const myEmail = (profile?.email || "").trim().toLowerCase();
    if (!myEmail) return [];
    return readStoredContactMessages().filter((m) => (m?.email || "").trim().toLowerCase() === myEmail);
  }, [profile?.email, contactMessagesRev]);

  const bumpContactMessages = () => setContactMessagesRev((n) => n + 1);
  const cancelEditContact = () => { setEditingContactId(null); setEditContactDraft(null); setEditContactError(""); };
  const startEditContact = (msg) => {
    if (!msg?.id) return;
    setEditContactError("");
    setEditingContactId(msg.id);
    setEditContactDraft({ firstName: msg.firstName || "", lastName: msg.lastName || "", phone: msg.phone || "", subject: msg.subject || "", message: msg.message || "" });
  };
  const saveEditContact = (msgId) => {
    if (!editContactDraft || !msgId) return;
    const validationMsg = validateContactMessageEditDraft(editContactDraft);
    if (validationMsg) { setEditContactError(validationMsg); return; }
    const myEmail = (profile?.email || "").trim().toLowerCase();
    if (!myEmail) return;
    const all = readStoredContactMessages();
    const idx = all.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const existing = all[idx];
    if ((existing?.email || "").trim().toLowerCase() !== myEmail) return;
    const updated = { ...existing, firstName: editContactDraft.firstName.trim(), lastName: editContactDraft.lastName.trim(), phone: editContactDraft.phone.trim(), subject: editContactDraft.subject.trim(), message: editContactDraft.message.trim(), lastEditedAt: new Date().toISOString() };
    writeStoredContactMessages([...all.slice(0, idx), updated, ...all.slice(idx + 1)]);
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

  const contactEditInputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box", fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };
  if (!getAuthToken()) return null;

  return (
    <AccountLayout active="contactMessages">
      <h1 style={sectionHeading}>My contact messages</h1>
      <p style={subtleNote}>Only contact messages submitted with the same email address as this account are shown.</p>
      {loadError && <p style={{ color: "#b91c1c", marginBottom: "16px" }}>{loadError}</p>}
      {storedContactMessages.length === 0 ? (
        <div style={cardStyle}><p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>No submitted contact messages yet.</p></div>
      ) : (
        <div style={{ display: "grid", gap: "16px", maxWidth: "980px" }}>
          {storedContactMessages.map((msg) => {
            const isEditing = editingContactId === msg.id;
            const anotherEditing = editingContactId !== null && editingContactId !== msg.id;
            return (
              <div key={msg.id || `${msg.submittedAt}-${msg.subject}`} style={cardStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>{isEditing ? editContactDraft?.subject : msg.subject || "—"}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Reference: {msg.id || "—"} · Submitted: {formatContactSubmittedAt(msg.submittedAt)}{msg.lastEditedAt ? ` · Updated: ${formatContactSubmittedAt(msg.lastEditedAt)}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#166534", backgroundColor: "#dcfce7", padding: "4px 10px", borderRadius: "999px" }}>{msg.status || "Submitted"}</span>
                    {msg.id ? (
                      <>
                        {isEditing ? (
                          <>
                            <button type="button" onClick={() => saveEditContact(msg.id)} style={{ padding: "6px 12px", borderRadius: "8px", border: "none", backgroundColor: "#FA8112", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Save</button>
                            <button type="button" onClick={cancelEditContact} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer", color: "#374151" }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" disabled={anotherEditing} onClick={() => startEditContact(msg)} style={{ padding: "6px 12px", borderRadius: "8px", border: "none", backgroundColor: "#FA8112", fontWeight: 700, fontSize: "13px", cursor: anotherEditing ? "not-allowed" : "pointer", color: "#ffffff", opacity: anotherEditing ? 0.5 : 1 }}>Edit</button>
                            <button type="button" disabled={anotherEditing} onClick={() => deleteContactMessage(msg.id)} style={{ padding: "6px 12px", borderRadius: "8px", border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: anotherEditing ? "not-allowed" : "pointer", opacity: anotherEditing ? 0.5 : 1 }}>Delete</button>
                          </>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
                {isEditing && editContactDraft ? (
                  <div style={{ display: "grid", gap: "12px", fontSize: "14px", color: "#374151" }}>
                    {editContactError ? <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 600, fontSize: "13px" }}>{editContactError}</div> : null}
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "12px" }}>
                      <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>FIRST NAME</div><input type="text" value={editContactDraft.firstName} maxLength={EDIT_CONTACT_MAX_NAME} onChange={(e) => { setEditContactError(""); setEditContactDraft((d) => (d ? { ...d, firstName: e.target.value } : d)); }} style={contactEditInputStyle} /></div>
                      <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>LAST NAME</div><input type="text" value={editContactDraft.lastName} maxLength={EDIT_CONTACT_MAX_NAME} onChange={(e) => { setEditContactError(""); setEditContactDraft((d) => (d ? { ...d, lastName: e.target.value } : d)); }} style={contactEditInputStyle} /></div>
                    </div>
                    <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>EMAIL (read-only)</div><input type="email" readOnly disabled value={msg.email || ""} style={{ ...contactEditInputStyle, backgroundColor: "#f9fafb", color: "#6b7280" }} /></div>
                    <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>PHONE</div><input type="tel" value={editContactDraft.phone} onChange={(e) => { setEditContactError(""); setEditContactDraft((d) => (d ? { ...d, phone: e.target.value } : d)); }} style={contactEditInputStyle} /></div>
                    <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>SUBJECT</div><input type="text" value={editContactDraft.subject} maxLength={EDIT_CONTACT_MAX_SUBJECT} onChange={(e) => { setEditContactError(""); setEditContactDraft((d) => (d ? { ...d, subject: e.target.value } : d)); }} style={contactEditInputStyle} /></div>
                    <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>MESSAGE</div><textarea value={editContactDraft.message} maxLength={EDIT_CONTACT_MAX_MESSAGE} onChange={(e) => { setEditContactError(""); setEditContactDraft((d) => (d ? { ...d, message: e.target.value } : d)); }} rows={6} style={{ ...contactEditInputStyle, resize: "vertical", minHeight: "120px" }} /></div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "12px", fontSize: "14px", color: "#374151" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "12px" }}>
                      <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>FROM</div><div style={{ fontWeight: 600 }}>{[msg.firstName, msg.lastName].filter(Boolean).join(" ").trim() || "—"}</div></div>
                      <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>EMAIL</div><div style={{ fontWeight: 600, wordBreak: "break-word" }}>{msg.email || "—"}</div></div>
                      <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "2px" }}>PHONE</div><div style={{ fontWeight: 600 }}>{msg.phone || "—"}</div></div>
                    </div>
                    <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>MESSAGE</div><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, padding: "12px 14px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb", color: "#1f2937" }}>{msg.message || "—"}</div></div>
                    {msg.adminReply ? <div><div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>RESPONSE FROM SUPPORT</div><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, padding: "12px 14px", backgroundColor: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0", color: "#166534" }}>{msg.adminReply}</div>{msg.adminRepliedAt ? <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Replied: {formatContactSubmittedAt(msg.adminRepliedAt)}</div> : null}</div> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
}
