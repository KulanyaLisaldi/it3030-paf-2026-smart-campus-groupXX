import React, { useCallback, useEffect, useRef, useState } from "react";
import { getTicketChatMessages, postTicketChatMessage } from "../api/ticketChat";
import { getAuthToken } from "../api/http";
import { readCampusUser } from "../utils/campusUserStorage";

const WA = {
  headerBg: "#075E54",
  headerText: "#FFFFFF",
  wallpaper: "#ECE5DD",
  bubbleOut: "#DCF8C6",
  bubbleIn: "#FFFFFF",
  inputBg: "#F0F0F0",
  sendBtn: "#128C7E",
};

/** Maps API errors to a clear title + body; keeps technical text for the details block. */
function describeChatError(err, context) {
  let status = err?.status;
  const technical = typeof err?.message === "string" ? err.message : "";
  if (status == null && technical) {
    const m = technical.match(/failed:\s*(\d+)/i);
    if (m) status = parseInt(m[1], 10);
  }
  const title = context === "send" ? "Message could not be sent" : "Messages could not be loaded";
  if (status === 404) {
    return {
      title,
      body:
        "The chat service was not found (HTTP 404). Restart the Spring Boot server after pulling the latest code so the `/api/tickets/.../chat` routes are registered.",
      technical,
    };
  }
  if (status === 401) {
    return {
      title,
      body: "Your session is missing or expired. Sign in again to use ticket chat.",
      technical,
    };
  }
  if (status === 403) {
    return {
      title,
      body: "You are not allowed to open this ticket chat (only the reporter and assigned technician can).",
      technical,
    };
  }
  if (status === 400) {
    return {
      title,
      body: technical || "The server rejected the request. Check your message and try again.",
      technical,
    };
  }
  return {
    title,
    body: technical || "Something went wrong. Try again or contact support if it continues.",
    technical,
  };
}

function formatChatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * WhatsApp-style thread between ticket reporter and assigned technician.
 * @param {object} props
 * @param {string} props.ticketId
 * @param {"USER"|"TECHNICIAN"} props.viewerRole
 * @param {string} props.peerName — name shown in header (the other party)
 * @param {boolean} props.hasAssignment — ticket has assignedTechnicianId
 * @param {number} [props.height=420] — chat panel height in px
 */
export default function TicketTechnicianChat({ ticketId, viewerRole, peerName, hasAssignment, height = 420 }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const token = getAuthToken();
  const campusUser = readCampusUser();
  const myId = campusUser?.id || "";

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const load = useCallback(async () => {
    if (!ticketId || !token || !hasAssignment) {
      setLoading(false);
      setMessages([]);
      return;
    }
    setError(null);
    try {
      const data = await getTicketChatMessages(ticketId);
      const list = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(list);
    } catch (err) {
      setError(describeChatError(err, "load"));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId, token, hasAssignment]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!ticketId || !token || !hasAssignment) return undefined;
    const id = window.setInterval(() => {
      load();
    }, 4500);
    return () => window.clearInterval(id);
  }, [ticketId, token, hasAssignment, load]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || !token || !hasAssignment || sending) return;
    setSending(true);
    setError(null);
    try {
      await postTicketChatMessage(ticketId, text);
      setDraft("");
      await load();
    } catch (err) {
      setError(describeChatError(err, "send"));
    } finally {
      setSending(false);
    }
  };

  if (!hasAssignment) {
    return (
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          padding: 16,
          backgroundColor: "#f9fafb",
          color: "#6b7280",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Chat with your technician will be available once an administrator assigns someone to this ticket.
      </div>
    );
  }

  if (!token) {
    return (
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #F5E7C6",
          padding: 16,
          backgroundColor: "#FAF3E1",
          color: "#92400e",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Sign in to exchange messages with {viewerRole === "USER" ? "your technician" : "the ticket reporter"}.
      </div>
    );
  }

  const title = viewerRole === "USER" ? peerName || "Technician" : peerName || "Ticket reporter";
  const subtitle = viewerRole === "USER" ? "Technician" : "Campus user";

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #d1d5db",
        display: "flex",
        flexDirection: "column",
        maxWidth: "100%",
        height,
        backgroundColor: WA.wallpaper,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          backgroundColor: WA.headerBg,
          color: WA.headerText,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          {(title || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px 12px" }}>
        {loading && <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Loading messages…</p>}
        {!loading && error && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{error.title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{error.body}</div>
            {error.technical ? (
              <details style={{ marginTop: 10, fontSize: 12, color: "#7f1d1d" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Technical details</summary>
                <pre
                  style={{
                    margin: "8px 0 0 0",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 11,
                    lineHeight: 1.4,
                  }}
                >
                  {error.technical}
                </pre>
              </details>
            ) : null}
          </div>
        )}
        {!loading &&
          messages.map((m) => {
            const mine = m.senderUserId && myId && m.senderUserId === myId;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    borderRadius: mine ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                    padding: "8px 11px",
                    backgroundColor: mine ? WA.bubbleOut : WA.bubbleIn,
                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                  }}
                >
                  {!mine && (
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#075E54", marginBottom: 4 }}>
                      {m.senderDisplayName || (m.senderRole === "TECHNICIAN" ? "Technician" : "User")}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: "#111827", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                  <div style={{ marginTop: 4, fontSize: 10, color: "#6b7280", textAlign: "right", fontWeight: 600 }}>
                    {formatChatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        style={{
          flexShrink: 0,
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          padding: "10px 10px 12px",
          backgroundColor: "#f6f6f6",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Type a message"
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            minHeight: 40,
            maxHeight: 120,
            borderRadius: 20,
            border: "none",
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            backgroundColor: WA.inputBg,
            lineHeight: 1.35,
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{
            border: "none",
            borderRadius: "50%",
            width: 46,
            height: 46,
            flexShrink: 0,
            backgroundColor: sending || !draft.trim() ? "#9ca3af" : WA.sendBtn,
            color: "#fff",
            cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            lineHeight: 1,
          }}
          aria-label="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
