import React, { useCallback, useEffect, useState } from "react";
import { fetchCurrentUser, updateNotificationPreferences } from "../../api/auth";
import { persistCampusUser, readCampusUser } from "../../utils/campusUserStorage";
import { notificationUiRootStyle } from "../../utils/notificationTypography";

/** Matches NotificationListView outer shell — full width of account main column */
const listShellStyle = {
  ...notificationUiRootStyle,
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: "24px",
};

const CATEGORIES = [
  { id: "BOOKING", label: "Bookings", hint: "Resource booking updates and reminders." },
  { id: "TICKET", label: "Support tickets", hint: "Maintenance ticket updates." },
];

function disabledListFromUser(user) {
  const raw = user?.notificationDisabledCategories;
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean);
}

function ToggleSwitch({ checked, disabled, onToggle, labelledBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onToggle()}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        border: "none",
        padding: 0,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "#FA8112" : "#e5e7eb",
        position: "relative",
        transition: "background 0.2s ease",
        flexShrink: 0,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}

export default function NotificationPreferencesCard() {
  const campusUser = readCampusUser();
  const isUser = String(campusUser?.role || "").toUpperCase() === "USER";

  const [loading, setLoading] = useState(isUser);
  const [loadError, setLoadError] = useState("");
  const [disabledCategories, setDisabledCategories] = useState(() => new Set(disabledListFromUser(campusUser)));
  const [saving, setSaving] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");

  const syncFromServerUser = useCallback((u) => {
    setDisabledCategories(new Set(disabledListFromUser(u)));
  }, []);

  useEffect(() => {
    if (!isUser) return;
    let mounted = true;
    (async () => {
      setLoadError("");
      try {
        const u = await fetchCurrentUser();
        if (!mounted) return;
        persistCampusUser(u);
        syncFromServerUser(u);
      } catch (e) {
        if (!mounted) return;
        setLoadError(e?.message || "Could not load preferences");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isUser, syncFromServerUser]);

  const isEnabled = (categoryId) => !disabledCategories.has(categoryId);

  const applyToggle = async (categoryId, nextEnabled) => {
    if (saving) return;
    const prevDisabled = new Set(disabledCategories);
    const nextDisabled = new Set(prevDisabled);
    if (nextEnabled) {
      nextDisabled.delete(categoryId);
    } else {
      nextDisabled.add(categoryId);
    }

    setDisabledCategories(nextDisabled);
    setPreferenceError("");
    setSaving(true);
    try {
      const updated = await updateNotificationPreferences({
        disabledCategories: Array.from(nextDisabled).sort(),
      });
      persistCampusUser(updated);
      syncFromServerUser(updated);
    } catch (e) {
      setDisabledCategories(prevDisabled);
      setPreferenceError(e?.message || "Could not update preferences");
    } finally {
      setSaving(false);
    }
  };

  if (!isUser) return null;

  if (loading) {
    return (
      <div style={listShellStyle}>
        <div style={{ padding: "16px 14px", color: "#64748b", fontSize: 14 }}>Loading notification settings…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={listShellStyle}>
        <div style={{ padding: "16px 14px", color: "#b91c1c", fontSize: 14 }}>{loadError}</div>
      </div>
    );
  }

  return (
    <div style={listShellStyle}>
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #f1f5f9",
          background: "#fafafa",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
          Notification preferences
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.55, fontWeight: 450 }}>
          Choose which in-app notifications you want to receive. This does not affect email from campus systems.
        </p>
      </div>
      {preferenceError ? (
        <div
          style={{
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#b91c1c",
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
          }}
        >
          {preferenceError}
        </div>
      ) : null}
      {CATEGORIES.map((c) => {
        const titleId = `pref-title-${c.id}`;
        const enabled = isEnabled(c.id);
        return (
          <div
            key={c.id}
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderTop: "1px solid #e8e8e8",
              background: "#fff7ed",
              padding: "14px 14px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id={titleId} style={{ fontSize: 14, fontWeight: 650, color: "#111827", lineHeight: 1.35, letterSpacing: "-0.015em" }}>
                {c.label}
              </div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 6, lineHeight: 1.5, fontWeight: 450 }}>{c.hint}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <ToggleSwitch
                checked={enabled}
                disabled={saving}
                labelledBy={titleId}
                onToggle={() => applyToggle(c.id, !enabled)}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: enabled ? "#9a3412" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {enabled ? "On" : "Off"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
