import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import { appFontFamily } from "../utils/appFont";

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

const tableWrapStyle = {
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
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
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  color: "#1f2937",
  verticalAlign: "top",
  wordBreak: "break-word",
};

const actionsThStyle = {
  ...thStyle,
  minWidth: "280px",
};

const actionsCellStyle = {
  ...tdStyle,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};

const actionsRowStyle = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "nowrap",
  alignItems: "center",
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

export default function AdminContactMessagesPage() {
  const [inboxRev, setInboxRev] = useState(0);
  const [detailMessage, setDetailMessage] = useState(null);

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
    setInboxRev((n) => n + 1);
  };

  const handleReply = (m) => {
    const to = (m?.email || "").trim();
    if (!to) {
      window.alert("No email address is available for this message.");
      return;
    }
    const ref = m?.id ? String(m.id) : "—";
    const subject = encodeURIComponent(`Re: ${m?.subject || "Your contact message"}`);
    const body = encodeURIComponent(
      `Hello,\n\nThank you for contacting the Smart Campus Support Desk.\n\nRegarding your message (reference ${ref}):\n\n`
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
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
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
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
              {rows.map((m) => (
                <tr key={m.id || `${m.submittedAt}-${m.email}-${m.subject}`}>
                  <td style={tdStyle}>{m.id || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatWhen(m.submittedAt)}</td>
                  <td style={tdStyle}>{displayName(m)}</td>
                  <td style={tdStyle}>{m.email || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{m.phone || "—"}</td>
                  <td style={tdStyle}>{m.subject || "—"}</td>
                  <td style={tdStyle}>{m.status || "Submitted"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatWhen(m.lastEditedAt)}</td>
                  <td style={actionsCellStyle}>
                    <div style={actionsRowStyle}>
                      <button type="button" style={btnDetailStyle} onClick={() => setDetailMessage(m)}>
                        Show detail
                      </button>
                      <button type="button" style={btnReplyStyle} onClick={() => handleReply(m)}>
                        Reply
                      </button>
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
                Message
              </div>
              <button type="button" onClick={() => setDetailMessage(null)} style={modalCloseButtonStyle}>
                Close
              </button>
            </div>
            <div style={{ padding: "18px 20px 22px" }}>
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
          </div>
        </div>
      ) : null}
      </div>
    </AdminLayout>
  );
}
