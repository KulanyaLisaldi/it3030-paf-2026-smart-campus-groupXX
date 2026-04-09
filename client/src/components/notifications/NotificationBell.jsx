import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";
import { getAuthToken } from "../../api/http";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";

function BellIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

function prettyTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleString();
}

export default function NotificationBell({
  panelMaxWidth = 380,
  buttonSize = 40,
  panelTopOffset = 10,
  iconColor = "#0f172a",
  buttonBorder = "1px solid #e2e8f0",
  buttonBackground = "#fff",
}) {
  const navigate = useNavigate();
  const token = getAuthToken();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyReadAll, setBusyReadAll] = useState(false);
  const wrapRef = useRef(null);
  const clientRef = useRef(null);

  const isLoggedIn = useMemo(() => !!token, [token]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let mounted = true;
    (async () => {
      try {
        const [list, countPayload] = await Promise.all([
          getNotifications(20),
          getUnreadNotificationCount(),
        ]);
        if (!mounted) return;
        setItems(Array.isArray(list) ? list : []);
        setUnreadCount(Number(countPayload?.unreadCount || 0));
      } catch {
        if (!mounted) return;
        setItems([]);
        setUnreadCount(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !token) return undefined;
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      debug: () => {},
    });
    client.onConnect = () => {
      client.subscribe("/user/queue/notifications", (frame) => {
        try {
          const payload = JSON.parse(frame.body || "{}");
          const n = payload?.notification;
          if (!n || !n.id) return;
          setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 50));
          if (Number.isFinite(Number(payload?.unreadCount))) {
            setUnreadCount(Number(payload.unreadCount));
          } else {
            setUnreadCount((c) => c + 1);
          }
        } catch {
          // ignore malformed message
        }
      });
    };
    client.activate();
    clientRef.current = client;
    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [isLoggedIn, token]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const markReadAndNavigate = async (item) => {
    const id = item?.id;
    const targetPath = item?.targetPath;
    if (id && !item.read) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(id);
      } catch {
        // keep optimistic UI
      }
    }
    setOpen(false);
    if (targetPath) navigate(targetPath);
  };

  const handleMarkAll = async () => {
    if (busyReadAll || unreadCount < 1) return;
    setBusyReadAll(true);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } finally {
      setBusyReadAll(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next) {
            setLoading(true);
            try {
              const list = await getNotifications(30);
              setItems(Array.isArray(list) ? list : []);
            } finally {
              setLoading(false);
            }
          }
        }}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: "50%",
          border: buttonBorder,
          background: buttonBackground,
          color: iconColor,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "#ef4444",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              border: "2px solid #fff",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: `calc(100% + ${panelTopOffset}px)`,
            right: 0,
            width: `min(${panelMaxWidth}px, calc(100vw - 24px))`,
            maxHeight: "min(68vh, 520px)",
            overflow: "hidden",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fff",
            boxShadow: "0 14px 42px rgba(15, 23, 42, 0.14)",
            zIndex: 1200,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Notifications</div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={busyReadAll || unreadCount < 1}
              style={{
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                color: "#9a3412",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: busyReadAll || unreadCount < 1 ? "not-allowed" : "pointer",
                opacity: busyReadAll || unreadCount < 1 ? 0.6 : 1,
              }}
            >
              Mark all read
            </button>
          </div>
          <div style={{ overflowY: "auto", minHeight: 0 }}>
            {loading && <div style={{ padding: "14px", color: "#64748b", fontSize: 13 }}>Loading...</div>}
            {!loading && items.length === 0 && (
              <div style={{ padding: "14px", color: "#64748b", fontSize: 13 }}>No notifications yet.</div>
            )}
            {!loading &&
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markReadAndNavigate(n)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid #f8fafc",
                    background: n.read ? "#fff" : "#fff7ed",
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: n.read ? 700 : 800, color: "#111827" }}>{n.title || "Notification"}</span>
                    {!n.read && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444", flexShrink: 0 }} />}
                  </div>
                  <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{n.message || ""}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{prettyTime(n.createdAt)}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
