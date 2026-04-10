import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationsPage,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";
import { getNotificationActionPath } from "../../utils/notificationDeepLink";
import { getNotificationDisplayTitle } from "../../utils/notificationDisplayTitle";
import { NOTIFICATION_UI_FONT, notificationUiRootStyle } from "../../utils/notificationTypography";

const PAGE_SIZE = 15;

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

const pagerBtn = (disabled) => ({
  border: "1px solid #e2e8f0",
  background: disabled ? "#f1f5f9" : "#fff",
  color: disabled ? "#94a3b8" : "#0f172a",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer",
});

export default function NotificationListView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyReadAll, setBusyReadAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [data, countPayload] = await Promise.all([
          getNotificationsPage(page, PAGE_SIZE),
          getUnreadNotificationCount(),
        ]);
        if (!mounted) return;
        setItems(Array.isArray(data?.content) ? data.content : []);
        setTotalPages(Number(data?.totalPages) || 0);
        setTotalElements(Number(data?.totalElements) || 0);
        setUnreadCount(Number(countPayload?.unreadCount) || 0);
      } catch {
        if (!mounted) return;
        setItems([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [page]);

  useEffect(() => {
    if (loading) return;
    if (totalPages > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [loading, totalPages, page]);

  const openNotification = async (n) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      try {
        await markNotificationRead(n.id);
        const countPayload = await getUnreadNotificationCount();
        setUnreadCount(Number(countPayload?.unreadCount) || 0);
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
      const countPayload = await getUnreadNotificationCount();
      setUnreadCount(Number(countPayload?.unreadCount) || 0);
    } finally {
      setBusyReadAll(false);
    }
  };

  const rangeStart = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = totalElements === 0 ? 0 : Math.min(totalElements, page * PAGE_SIZE + items.length);
  const canPrev = page > 0;
  const canNext = totalPages > 0 && page < totalPages - 1;

  return (
    <div
      style={{
        ...notificationUiRootStyle,
        width: "100%",
        boxSizing: "border-box",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#475569", letterSpacing: "-0.01em" }}>{unreadCount} unread</span>
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
            fontFamily: "inherit",
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
              fontFamily: NOTIFICATION_UI_FONT,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: n.read ? 650 : 700,
                  color: "#111827",
                  lineHeight: 1.35,
                  letterSpacing: "-0.015em",
                }}
              >
                {getNotificationDisplayTitle(n)}
              </span>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />}
            </div>
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, fontWeight: 450 }}>{n.message || ""}</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, letterSpacing: "0.01em" }}>{prettyTimeDetailed(n.createdAt)}</span>
              <span style={viewFullLinkStyle}>View full notification</span>
            </div>
          </button>
        ))}
      {!loading && totalElements > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "#fafafa",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            Showing {rangeStart}–{rangeEnd} of {totalElements} · Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" style={pagerBtn(!canPrev)} disabled={!canPrev} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </button>
            <button type="button" style={pagerBtn(!canNext)} disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
