import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";

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

export default function NotificationListView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [busyReadAll, setBusyReadAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getNotifications(100)
      .then((rows) => {
        if (!mounted) return;
        setItems(Array.isArray(rows) ? rows : []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  const openNotification = async (n) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      try {
        await markNotificationRead(n.id);
      } catch {
        // keep optimistic UI
      }
    }
    if (n.targetPath) navigate(n.targetPath);
  };

  const markAll = async () => {
    if (busyReadAll || unreadCount < 1) return;
    setBusyReadAll(true);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await markAllNotificationsRead();
    } finally {
      setBusyReadAll(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>{unreadCount} unread</span>
        <button
          type="button"
          onClick={markAll}
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
      {loading && <div style={{ padding: 16, color: "#64748b", fontSize: 14 }}>Loading notifications...</div>}
      {!loading && items.length === 0 && <div style={{ padding: 16, color: "#64748b", fontSize: 14 }}>No notifications yet.</div>}
      {!loading &&
        items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openNotification(n)}
            style={{
              width: "100%",
              border: "none",
              borderTop: "1px solid #f8fafc",
              background: n.read ? "#fff" : "#fff7ed",
              textAlign: "left",
              padding: "12px 14px",
              cursor: "pointer",
              display: "grid",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: n.read ? 700 : 800, color: "#111827" }}>{n.title || "Notification"}</span>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />}
            </div>
            <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.45 }}>{n.message || ""}</span>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{prettyTime(n.createdAt)}</span>
          </button>
        ))}
    </div>
  );
}
