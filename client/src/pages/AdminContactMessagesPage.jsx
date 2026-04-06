import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import { appFontFamily } from "../utils/appFont";
import {
  ERR_LONG_TEXT_CHARS,
  ERR_SAME_CHAR_RUN,
  hasExcessiveConsecutiveSameChar,
  longTextCharsValid,
} from "../utils/contactMessageValidation";

/** Same key as ContactUs / ManageAccount local submissions. */
const CONTACT_MESSAGES_STORAGE_KEY = "smartCampusContactMessages";

function readAllContactMessages() {
  try {
    const raw = localStorage.getItem(CONTACT_MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllContactMessages(list) {
  try {
    localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function messagesMatch(a, b) {
  if (a?.id && b?.id) return a.id === b.id;
  return (
    String(a?.submittedAt || "") === String(b?.submittedAt || "") &&
    String(a?.email || "") === String(b?.email || "") &&
    String(a?.subject || "") === String(b?.subject || "")
  );
}

/** Remove one row; matches by id when present, else by submittedAt + email + subject. */
function removeMessageFromStorage(m) {
  const all = readAllContactMessages();
  let next;
  if (m?.id) {
    next = all.filter((x) => x.id !== m.id);
  } else {
    next = all.filter(
      (x) =>
        !(
          String(x?.submittedAt || "") === String(m?.submittedAt || "") &&
          String(x?.email || "") === String(m?.email || "") &&
          String(x?.subject || "") === String(m?.subject || "")
        )
    );
  }
  writeAllContactMessages(next);
}

/** Persist support reply on the matching contact record (same browser localStorage). */
function saveAdminReplyForMessage(m, replyText) {
  const all = readAllContactMessages();
  const idx = all.findIndex((x) => messagesMatch(x, m));
  if (idx === -1) return null;
  const trimmed = replyText.trim();
  const prev = all[idx];
  const nextItem = { ...prev };
  if (trimmed) {
    nextItem.adminReply = trimmed;
    nextItem.adminRepliedAt = new Date().toISOString();
    nextItem.status = "Replied";
  } else {
    delete nextItem.adminReply;
    delete nextItem.adminRepliedAt;
    nextItem.status = "Submitted";
  }
  const next = [...all.slice(0, idx), nextItem, ...all.slice(idx + 1)];
  writeAllContactMessages(next);
  return nextItem;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  } catch {
    return "—";
  }
}

function displayName(m) {
  const n = [m?.firstName, m?.lastName].filter(Boolean).join(" ").trim();
  return n || "—";
}

function hasSavedAdminReply(m) {
  return typeof m?.adminReply === "string" && m.adminReply.trim().length > 0;
}

const MIN_ADMIN_REPLY_LEN = 10;
const MAX_ADMIN_REPLY_LEN = 4000;

/** Status shown and used for filtering: storage field or implied Replied when a reply exists. */
function effectiveContactStatus(m) {
  if (hasSavedAdminReply(m)) return "Replied";
  return String(m?.status || "Submitted").trim() || "Submitted";
}

function messageSearchHaystack(m) {
  const name = [m?.firstName, m?.lastName].filter(Boolean).join(" ").trim();
  return [m?.id, name, m?.email, m?.phone, m?.subject, m?.message, m?.status, effectiveContactStatus(m)]
    .filter((x) => x != null && String(x).length > 0)
    .join(" ")
    .toLowerCase();
}

function applyContactMessageFilters(list, { search, statusFilter }) {
  const q = search.trim().toLowerCase();
  return list.filter((m) => {
    if (q && !messageSearchHaystack(m).includes(q)) return false;
    if (statusFilter !== "all" && effectiveContactStatus(m) !== statusFilter) return false;
    return true;
  });
}

/** Last updated column: time the support reply was saved, else user’s last edit. */
function formatLastUpdatedCell(m) {
  if (m?.adminRepliedAt) return formatWhen(m.adminRepliedAt);
  return formatWhen(m.lastEditedAt);
}

const tableWrapStyle = {
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

/** Min table width (colgroup sum); wrapper scrolls horizontally on narrow viewports */
const CONTACT_TABLE_MIN_WIDTH = 1700;

const tableStyle = {
  width: "100%",
  minWidth: CONTACT_TABLE_MIN_WIDTH,
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: "14px",
  fontFamily: appFontFamily,
};

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  backgroundColor: "#FAF3E1",
  color: "#374151",
  fontWeight: 700,
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "2px solid #F5E7C6",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  boxSizing: "border-box",
};

const tdBaseStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  color: "#1f2937",
  verticalAlign: "middle",
  boxSizing: "border-box",
};

/** Default body cell (subject etc.): wrap only at word boundaries */
const tdStyle = {
  ...tdBaseStyle,
  wordBreak: "normal",
  overflowWrap: "break-word",
};

/** Single-line cells with sensible column width */
const tdNowrapStyle = {
  ...tdBaseStyle,
  whiteSpace: "nowrap",
};

/** Long tokens (reference, email, name): ellipsis when space is tight */
const tdNowrapEllipsisStyle = {
  ...tdBaseStyle,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 0,
};

const tdSubjectStyle = {
  ...tdBaseStyle,
  wordBreak: "normal",
  overflowWrap: "break-word",
  hyphens: "auto",
};

const actionsThStyle = {
  ...thStyle,
  width: 292,
  minWidth: 292,
  textAlign: "left",
};

const actionsCellStyle = {
  ...tdBaseStyle,
  width: 292,
  minWidth: 292,
  whiteSpace: "nowrap",
  textAlign: "left",
};

const actionsRowStyle = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "nowrap",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "6px",
};

const emptyCardStyle = {
  maxWidth: "640px",
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  padding: "32px 28px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.55,
};

const btnDetailStyle = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#FA8112",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  flexShrink: 0,
};

const btnReplyStyle = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#15803d",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  flexShrink: 0,
};

const btnDeleteStyle = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
  flexShrink: 0,
};

/** Same font stack as admin ticket dashboard; scopes this page’s table, empty state, and modal. */
const pageContentStyle = {
  fontFamily: appFontFamily,
};

/** Gray secondary close control aligned with admin ticket button typography (weight/size). */
const modalCloseButtonStyle = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #4b5563",
  backgroundColor: "#6b7280",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "14px",
  fontFamily: appFontFamily,
  lineHeight: 1,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const replyModalPrimaryBtnStyle = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#15803d",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "14px",
  fontFamily: appFontFamily,
  lineHeight: 1,
  cursor: "pointer",
};

const replyModalSecondaryBtnStyle = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#374151",
  fontWeight: 600,
  fontSize: "14px",
  fontFamily: appFontFamily,
  lineHeight: 1,
  cursor: "pointer",
};

const replyModalErrorStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontWeight: 600,
  fontSize: "13px",
  lineHeight: 1.4,
};

const filterToolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: "12px 20px",
  marginBottom: "16px",
  padding: "14px 18px",
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  position: "relative",
  zIndex: 1,
};

const filterFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minWidth: 0,
};

const filterLabelStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#6b7280",
  letterSpacing: "0.04em",
};

const filterSearchInputStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: appFontFamily,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  minWidth: "min(100%, 260px)",
  width: "min(100%, 320px)",
  boxSizing: "border-box",
};

const filterSelectStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 32px 10px 12px",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: appFontFamily,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  minWidth: "168px",
  maxWidth: "100%",
  boxSizing: "border-box",
  cursor: "pointer",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

const filterClearBtnStyle = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#374151",
  fontWeight: 600,
  fontSize: "13px",
  fontFamily: appFontFamily,
  cursor: "pointer",
  lineHeight: 1,
};

const filterMetaStyle = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: 600,
  width: "100%",
  paddingTop: "4px",
  textAlign: "right",
};

const noFilterMatchStyle = {
  ...emptyCardStyle,
  maxWidth: "none",
};

export default function AdminContactMessagesPage() {
  const [inboxRev, setInboxRev] = useState(0);
  const [detailMessage, setDetailMessage] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const reload = () => setInboxRev((n) => n + 1);
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);

  const rows = useMemo(() => {
    const list = readAllContactMessages();
    return [...list].sort((a, b) => {
      const ta = new Date(a?.submittedAt || 0).getTime();
      const tb = new Date(b?.submittedAt || 0).getTime();
      return tb - ta;
    });
  }, [inboxRev]);

  const statusOptions = useMemo(() => {
    const set = new Set(["Submitted", "Replied"]);
    rows.forEach((m) => {
      set.add(effectiveContactStatus(m));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      applyContactMessageFilters(rows, {
        search: filterSearch,
        statusFilter: filterStatus,
      }),
    [rows, filterSearch, filterStatus]
  );

  const filtersActive = filterSearch.trim().length > 0 || filterStatus !== "all";

  const clearFilters = () => {
    setFilterSearch("");
    setFilterStatus("all");
  };

  const handleDelete = (m) => {
    const ok = window.confirm("Delete this contact message from local storage? This cannot be undone.");
    if (!ok) return;
    removeMessageFromStorage(m);
    setDetailMessage((cur) => {
      if (!cur) return null;
      if (m?.id && cur?.id === m.id) return null;
      if (
        !m?.id &&
        String(cur?.submittedAt || "") === String(m?.submittedAt || "") &&
        String(cur?.email || "") === String(m?.email || "") &&
        String(cur?.subject || "") === String(m?.subject || "")
      ) {
        return null;
      }
      return cur;
    });
    setReplyTarget((cur) => (cur && messagesMatch(cur, m) ? null : cur));
    setInboxRev((n) => n + 1);
  };

  const openReplyComposer = (m) => {
    setReplyError("");
    setReplyTarget(m);
    setReplyDraft(typeof m?.adminReply === "string" ? m.adminReply : "");
  };

  const closeReplyComposer = () => {
    setReplyTarget(null);
    setReplyDraft("");
    setReplyError("");
  };

  const submitAdminReply = () => {
    if (!replyTarget) return;
    const trimmed = replyDraft.trim();
    if (!trimmed) {
      if (hasSavedAdminReply(replyTarget)) {
        const ok = window.confirm(
          "Remove this support reply? The message status will return to Submitted until you add a new reply."
        );
        if (!ok) return;
        setReplyError("");
        const updated = saveAdminReplyForMessage(replyTarget, "");
        if (!updated) {
          window.alert("Could not update message; it was not found in storage.");
          return;
        }
        setDetailMessage((cur) => (cur && messagesMatch(cur, replyTarget) ? updated : cur));
        closeReplyComposer();
        setInboxRev((n) => n + 1);
        return;
      }
      setReplyError("Please enter a reply message.");
      return;
    }
    if (trimmed.length < MIN_ADMIN_REPLY_LEN) {
      setReplyError(`Reply must be at least ${MIN_ADMIN_REPLY_LEN} characters.`);
      return;
    }
    if (trimmed.length > MAX_ADMIN_REPLY_LEN) {
      setReplyError(`Reply must be at most ${MAX_ADMIN_REPLY_LEN} characters.`);
      return;
    }
    if (!longTextCharsValid(trimmed)) {
      setReplyError(ERR_LONG_TEXT_CHARS);
      return;
    }
    if (hasExcessiveConsecutiveSameChar(trimmed)) {
      setReplyError(ERR_SAME_CHAR_RUN);
      return;
    }
    setReplyError("");
    const updated = saveAdminReplyForMessage(replyTarget, replyDraft);
    if (!updated) {
      window.alert("Could not save reply; message was not found in storage.");
      return;
    }
    setDetailMessage((cur) => (cur && messagesMatch(cur, replyTarget) ? updated : cur));
    closeReplyComposer();
    setInboxRev((n) => n + 1);
  };

  return (
    <AdminLayout
      activeSection="contactMessages"
      pageTitle="Contact Messages Management"
      description="Messages submitted from the public Contact Support form on this browser (local storage). Newest first."
    >
      <div style={pageContentStyle}>
      {rows.length === 0 ? (
        <div style={emptyCardStyle}>No contact messages have been submitted yet.</div>
      ) : (
        <>
          <div style={filterToolbarStyle}>
            <div style={filterFieldStyle}>
              <label htmlFor="contact-filter-search" style={filterLabelStyle}>
                SEARCH
              </label>
              <input
                id="contact-filter-search"
                type="search"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder="Reference, name, email, subject, message…"
                style={filterSearchInputStyle}
                autoComplete="off"
              />
            </div>
            <div style={filterFieldStyle}>
              <label htmlFor="contact-filter-status" style={filterLabelStyle}>
                STATUS
              </label>
              <select
                id="contact-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="all">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {filtersActive ? (
              <button type="button" style={filterClearBtnStyle} onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
            <div style={filterMetaStyle}>
              Showing {filteredRows.length} of {rows.length} message{rows.length === 1 ? "" : "s"}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div style={noFilterMatchStyle}>
              No messages match your filters.{" "}
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  ...filterClearBtnStyle,
                  marginTop: "12px",
                  display: "inline-block",
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: 140 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 300 }} />
              <col style={{ width: 112 }} />
              <col style={{ width: 176 }} />
              <col style={{ width: 292 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>Reference</th>
                <th style={thStyle}>Submitted</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Subject</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Last updated</th>
                <th style={actionsThStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((m) => (
                <tr key={m.id || `${m.submittedAt}-${m.email}-${m.subject}`}>
                  <td style={tdNowrapEllipsisStyle} title={m.id || undefined}>
                    {m.id || "—"}
                  </td>
                  <td style={tdNowrapStyle}>{formatWhen(m.submittedAt)}</td>
                  <td style={tdNowrapEllipsisStyle} title={displayName(m) !== "—" ? displayName(m) : undefined}>
                    {displayName(m)}
                  </td>
                  <td style={tdNowrapEllipsisStyle} title={m.email || undefined}>
                    {m.email || "—"}
                  </td>
                  <td style={tdNowrapStyle}>{m.phone || "—"}</td>
                  <td style={tdSubjectStyle}>{m.subject || "—"}</td>
                  <td style={tdNowrapStyle}>{effectiveContactStatus(m)}</td>
                  <td style={tdNowrapStyle}>{formatLastUpdatedCell(m)}</td>
                  <td style={actionsCellStyle}>
                    <div style={actionsRowStyle}>
                      <button type="button" style={btnDetailStyle} onClick={() => setDetailMessage(m)}>
                        Show detail
                      </button>
                      {!hasSavedAdminReply(m) ? (
                        <button type="button" style={btnReplyStyle} onClick={() => openReplyComposer(m)}>
                          Reply
                        </button>
                      ) : null}
                      <button type="button" style={btnDeleteStyle} onClick={() => handleDelete(m)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}

      {detailMessage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-detail-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailMessage(null);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflow: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div id="contact-detail-title" style={{ fontSize: "16px", fontWeight: 800, color: "#14213D" }}>
                Contact message
              </div>
              <button type="button" onClick={() => setDetailMessage(null)} style={modalCloseButtonStyle}>
                Close
              </button>
            </div>
            <div style={{ padding: "18px 20px 22px", display: "grid", gap: "18px" }}>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#6b7280",
                    letterSpacing: "0.04em",
                    marginBottom: "8px",
                  }}
                >
                  SUBMITTED MESSAGE
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55,
                    padding: "14px 16px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    color: "#1f2937",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {detailMessage.message || "—"}
                </div>
              </div>
              {detailMessage.adminReply ? (
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6b7280",
                      letterSpacing: "0.04em",
                      marginBottom: "8px",
                    }}
                  >
                    SUPPORT REPLY
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.55,
                      padding: "14px 16px",
                      backgroundColor: "#ecfdf5",
                      borderRadius: "10px",
                      border: "1px solid #a7f3d0",
                      color: "#166534",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {detailMessage.adminReply}
                  </div>
                  {detailMessage.adminRepliedAt ? (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                      Replied: {formatWhen(detailMessage.adminRepliedAt)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {replyTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-reply-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4100,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeReplyComposer();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflow: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              fontFamily: appFontFamily,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div id="contact-reply-title" style={{ fontSize: "16px", fontWeight: 800, color: "#14213D" }}>
                Write support reply
              </div>
              <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280", fontWeight: 500, lineHeight: 1.45 }}>
                Reference: {replyTarget.id || "—"}
                {replyTarget.email ? ` · ${replyTarget.email}` : ""}
                <br />
                This text is saved with this contact message and is visible to the user under My contact messages.
              </div>
            </div>
            <div style={{ padding: "18px 20px 22px", display: "grid", gap: "14px" }}>
              <label style={{ display: "grid", gap: "8px", margin: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", letterSpacing: "0.04em" }}>
                  REPLY MESSAGE
                </span>
                <textarea
                  value={replyDraft}
                  onChange={(e) => {
                    setReplyError("");
                    setReplyDraft(e.target.value);
                  }}
                  rows={8}
                  maxLength={MAX_ADMIN_REPLY_LEN}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "14px",
                    fontFamily: appFontFamily,
                    lineHeight: 1.5,
                    resize: "vertical",
                    minHeight: "140px",
                    color: "#1f2937",
                  }}
                  placeholder="Type your reply to the user…"
                />
              </label>
              {replyError ? <div role="alert" style={replyModalErrorStyle}>{replyError}</div> : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" style={replyModalSecondaryBtnStyle} onClick={closeReplyComposer}>
                  Cancel
                </button>
                <button type="button" style={replyModalPrimaryBtnStyle} onClick={submitAdminReply}>
                  Save reply
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </AdminLayout>
  );
}
