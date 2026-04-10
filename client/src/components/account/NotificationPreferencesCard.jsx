import React, { useCallback, useEffect, useState } from "react";
import { fetchCurrentUser, updateNotificationPreferences } from "../../api/auth";
import { persistCampusUser, readCampusUser } from "../../utils/campusUserStorage";

const CARD_STYLE = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "18px 20px",
  marginBottom: "28px",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const ROW_STYLE = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  paddingTop: "14px",
  paddingBottom: "14px",
  borderTop: "1px solid #f3f4f6",
};

const CATEGORIES = [
  {
    id: "BOOKING",
    title: "Booking updates",
    description: "Approvals, rejections, cancellations, and schedule changes for your resource bookings.",
  },
  {
    id: "TICKET",
    title: "Support ticket updates",
    description: "Status changes and new messages on tickets you submitted.",
  },
];

function toggleTrackStyle(on) {
  return {
    width: 44,
    height: 24,
    borderRadius: 999,
    border: "1px solid #fcd34d",
    background: on ? "#FA8112" : "#e5e7eb",
    padding: 2,
    cursor: "pointer",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: on ? "flex-end" : "flex-start",
    transition: "background 0.15s ease",
    boxSizing: "border-box",
  };
}

const KNOB = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
};

function normalizeDisabled(list) {
  if (!Array.isArray(list)) return [];
  return list.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean);
}

export default function NotificationPreferencesCard() {
  const [disabled, setDisabled] = useState(() => normalizeDisabled(readCampusUser()?.notificationDisabledCategories));
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const syncFromUser = useCallback((u) => {
    setDisabled(normalizeDisabled(u?.notificationDisabledCategories));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await fetchCurrentUser();
        if (!cancelled) {
          persistCampusUser(u);
          syncFromUser(u);
        }
      } catch {
        /* keep localStorage snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncFromUser]);

  const setCategoryEnabled = async (categoryId, enabled) => {
    const upper = String(categoryId).toUpperCase();
    const nextDisabled = enabled
      ? disabled.filter((d) => d !== upper)
      : [...new Set([...disabled, upper])];
    setError("");
    setBusyId(upper);
    try {
      const updated = await updateNotificationPreferences({ disabledCategories: nextDisabled });
      persistCampusUser(updated);
      syncFromUser(updated);
    } catch (e) {
      setError(e?.message || "Could not update preferences.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section style={CARD_STYLE} aria-labelledby="notification-prefs-heading">
      <h2 id="notification-prefs-heading" style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>
        Notification preferences
      </h2>
      <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 8px 0", lineHeight: 1.5 }}>
        Choose which in-app notification types you want to receive. This does not affect email from support workflows.
      </p>
      {error ? (
        <p style={{ margin: "8px 0 0 0", fontSize: "13px", fontWeight: 600, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}
      <div style={{ marginTop: 4 }}>
        {CATEGORIES.map((cat, idx) => {
          const enabled = !disabled.includes(cat.id);
          const toggling = busyId === cat.id;
          return (
            <div key={cat.id} style={{ ...ROW_STYLE, borderTop: idx === 0 ? "none" : ROW_STYLE.borderTop }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 650, color: "#111827" }}>{cat.title}</div>
                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>{cat.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={toggling}
                onClick={() => setCategoryEnabled(cat.id, !enabled)}
                style={{
                  ...toggleTrackStyle(enabled),
                  opacity: toggling ? 0.75 : 1,
                  cursor: toggling ? "wait" : "pointer",
                }}
                aria-label={enabled ? `${cat.title} notifications on` : `${cat.title} notifications off`}
              >
                <span style={KNOB} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
