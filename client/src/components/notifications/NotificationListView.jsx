import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";
import { getNotificationActionPath } from "../../utils/notificationDeepLink";
import { getNotificationDisplayTitle } from "../../utils/notificationDisplayTitle";

function prettyTimeDetailed(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  if (hr < 24) {
    if (remMin === 0) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    return `${hr} hour${hr === 1 ? "" : "s"} ${remMin} min${remMin === 1 ? "" : "s"} ago`;
  }
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString();
}

const viewFullLinkStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#FA8112",
  flexShrink: 0,
  marginLeft: 10,
};

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
    navigate(getNotificationActionPath(n));
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
              borderTop: "1px solid #e8e8e8",
              background: n.read ? "#fff" : "#fff7ed",
              textAlign: "left",
              padding: "14px 14px 12px",
              cursor: "pointer",
              display: "grid",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: n.read ? 700 : 800, color: "#111827", lineHeight: 1.35 }}>{getNotificationDisplayTitle(n)}</span>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />}
            </div>
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.45 }}>{n.message || ""}</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{prettyTimeDetailed(n.createdAt)}</span>
              <span style={viewFullLinkStyle}>View full notification</span>
            </div>
          </button>
        ))}
    </div>
  );
}
