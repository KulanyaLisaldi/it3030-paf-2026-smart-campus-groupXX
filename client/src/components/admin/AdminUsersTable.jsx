import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  adminChangeUserRole,
  adminDeleteUser,
  adminResetTechnicianPassword,
  adminSetUserStatus,
  adminUpdateUserProfile,
  getAdminUsers,
} from "../../api/adminUsers";
import { readCampusUser } from "../../utils/campusUserStorage";
import { isValidProfilePhone, phoneFromServer, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../../utils/profilePhone";

/** Light orange frame lines (buttons keep their own border styles). */
const BORDER_LIGHT_ORANGE = "#F5D4B0";

const BOOKING_TABLE_BORDER = "#FFDDB8";

const pageCardStyle = {
  maxWidth: "100%",
  minWidth: 0,
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: `1px solid ${BORDER_LIGHT_ORANGE}`,
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
  padding: "18px",
  boxSizing: "border-box",
};

/** Matches AdminBookingsPage booking-details table (horizontal scroll + min width). */
const tableStyle = {
  width: "max-content",
  minWidth: 1160,
  borderCollapse: "collapse",
  fontSize: "13px",
};

const userTableSectionStyle = {
  border: `1px solid ${BOOKING_TABLE_BORDER}`,
  borderRadius: 12,
  padding: 0,
  background: "#fff",
  overflow: "hidden",
};

const userTableScrollWrapStyle = {
  width: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
};

const userTablePaginationFooterStyle = {
  borderTop: "1px solid #F5E7C6",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

/** View action — same border treatment as AdminBookingsPage row actions. */
const userTableViewBtnStyle = {
  padding: "8px 10px",
  borderRadius: "10px",
  border: `1px solid ${BOOKING_TABLE_BORDER}`,
  fontWeight: 800,
  fontSize: "12px",
  cursor: "pointer",
  background: "#fff",
  color: "#0f172a",
  textAlign: "center",
};

const thStyle = {
  textAlign: "left",
  padding: "12px 10px",
  fontWeight: 800,
  color: "#374151",
  backgroundColor: "#FAF3E1",
  borderBottom: "1px solid #F5E7C6",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const tdStyle = {
  padding: "10px 10px",
  borderBottom: `1px solid ${BOOKING_TABLE_BORDER}`,
  color: "#334155",
  verticalAlign: "top",
};

const rowStyle = (isHovered) => ({
  backgroundColor: isHovered ? "#f8fafc" : "#ffffff",
  transition: "background-color 0.16s ease",
});
const PAGE_SIZE = 10;

const smallBtnStyle = (variant = "neutral") => {
  const base = {
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid transparent",
    fontWeight: 800,
    fontSize: "12px",
    cursor: "pointer",
    background: "#fff",
  };
  if (variant === "danger") {
    return { ...base, border: "1px solid #fecaca", color: "#b91c1c", background: "#fff" };
  }
  if (variant === "primary") {
    return { ...base, border: "1px solid rgba(250,129,18,0.35)", color: "#9a3412", background: "rgba(250,129,18,0.10)" };
  }
  return { ...base, border: "1px solid #e5e7eb", color: "#0f172a" };
};

const iconBtnStyle = (variant = "neutral") => ({
  ...smallBtnStyle(variant),
  width: "34px",
  height: "34px",
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

/** Light border + left accent strip (aligned with Resource Management summary cards). */
const summaryCardBaseStyle = {
  backgroundColor: "#FFFFFF",
  border: `1px solid ${BORDER_LIGHT_ORANGE}`,
  borderRadius: "12px",
  padding: "12px",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};
const summaryLabelStyle = { fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" };
const summaryValueStyle = { fontSize: "26px", fontWeight: 800, color: "#14213D", marginTop: 4 };

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

/** Google accounts are verified by Google; email technicians use server field (Yes/No). */
function emailVerifiedDisplay(u) {
  if (!u) return "—";
  const provider = String(u.provider || "").trim().toLowerCase();
  if (provider.includes("google")) return "Yes";
  const v = u.technicianEmailVerified;
  if (v === "Yes" || v === "No") return v;
  return "—";
}

function toDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(value) {
  const d = toDateSafe(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKey(value) {
  const d = toDateSafe(value);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function roleBadgeStyle(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") {
    return { background: "#dbeafe", border: "1px solid #93c5fd", color: "#1d4ed8" };
  }
  if (r === "TECHNICIAN") {
    return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  }
  return { background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" };
}

function statusBadgeStyle(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DISABLED" || s === "SUSPENDED") {
    return { background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" };
  }
  return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
}

function Badge({ text, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 800,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {text}
    </span>
  );
}

export default function AdminUsersTable({ onAddTechnician, refreshKey = 0, onRequestRefresh }) {
  const location = useLocation();
  const currentUserId = useMemo(() => {
    const me = readCampusUser();
    return String(me?.id || "").trim();
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsUser, setDetailsUser] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [editAccountStatus, setEditAccountStatus] = useState("Active");
  const [resetPasswordDraft, setResetPasswordDraft] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addUserMenuOpen, setAddUserMenuOpen] = useState(false);
  const [mainTab, setMainTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab === "details" || tab === "all-users" ? "allUsers" : "dashboard";
  });

  const modalInputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: `1px solid ${BORDER_LIGHT_ORANGE}`,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#FFFFFF",
    color: "#0f172a",
  };

  useEffect(() => {
    if (!editPanelOpen || !selectedUser) return;
    setEditFirstName(selectedUser.firstName || "");
    setEditLastName(selectedUser.lastName || "");
    setEditEmail(selectedUser.email || "");
    setEditPhoneNumber(phoneFromServer(selectedUser.phoneNumber));
    setEditRole(String(selectedUser.role || "USER").toUpperCase());
    setEditAccountStatus((selectedUser.accountStatus || "") === "Disabled" ? "Disabled" : "Active");
    setResetPasswordDraft("");
    setResetMessage("");
    setActionError("");
  }, [editPanelOpen, selectedUser]);

  const refresh = () => {
    if (typeof onRequestRefresh === "function") onRequestRefresh();
  };

  const handleEditSave = async () => {
    if (!selectedUser) return;
    const selectedRoleUpper = String(selectedUser.role || "").toUpperCase();
    const selectedProvider = String(selectedUser.provider || "");
    const phoneDigits = editPhoneNumber || "";
    const emailDraft = String(editEmail || "").trim();
    if (!emailDraft) {
      setActionError("Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailDraft)) {
      setActionError("Enter a valid email address.");
      return;
    }
    if (selectedProvider === "Google OAuth" && emailDraft.toLowerCase() !== String(selectedUser.email || "").toLowerCase()) {
      setActionError("Google OAuth account email cannot be changed.");
      return;
    }
    if (phoneDigits && !isValidProfilePhone(phoneDigits)) {
      setActionError("Phone number must be exactly 10 digits or left empty.");
      return;
    }
    setActionBusy(true);
    setActionError("");
    try {
      let updated = await adminUpdateUserProfile(selectedUser.userId, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: emailDraft,
        phoneNumber: phoneDigits ? phoneDigits : null,
      });
      if (String(updated.role || "").toUpperCase() !== String(editRole || "").toUpperCase()) {
        updated = await adminChangeUserRole(selectedUser.userId, { role: editRole });
      }
      const targetDisabled = editAccountStatus === "Disabled";
      const currentDisabled = String(updated.accountStatus || "").toUpperCase() === "DISABLED";
      if (targetDisabled !== currentDisabled) {
        if (selectedRoleUpper === "ADMIN") {
          throw new Error("Admin accounts cannot be deactivated.");
        }
        if (currentUserId && selectedUser.userId === currentUserId && targetDisabled) {
          throw new Error("You cannot disable your own account.");
        }
        updated = await adminSetUserStatus(selectedUser.userId, { disabled: targetDisabled });
      }
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
      setDetailsUser((prev) => (prev && prev.userId === updated.userId ? updated : prev));
      setSelectedUser(updated);
      setEditPanelOpen(false);
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to update user.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleAdminPasswordReset = async () => {
    if (!selectedUser) return;
    const selectedRoleUpper = String(selectedUser.role || "").toUpperCase();
    const provider = String(selectedUser.provider || "");
    if (selectedRoleUpper !== "TECHNICIAN") {
      setResetMessage("Password reset is allowed for technicians only.");
      return;
    }
    if (provider === "Google OAuth") {
      setResetMessage("Google sign-in users do not support local password reset.");
      return;
    }
    if (!resetPasswordDraft.trim()) {
      setResetMessage("Enter a new temporary password.");
      return;
    }
    setResetBusy(true);
    setResetMessage("");
    try {
      await adminResetTechnicianPassword(selectedUser.userId, { newPassword: resetPasswordDraft.trim() });
      setResetPasswordDraft("");
      setResetMessage("Technician password reset successfully.");
    } catch (e) {
      setResetMessage(e.message || "Failed to reset password.");
    } finally {
      setResetBusy(false);
    }
  };

  const handleToggleDisabled = async (u) => {
    if (!u) return;
    if ((u.role || "").toUpperCase() === "ADMIN") {
      setActionError("Admin accounts cannot be deactivated.");
      return;
    }
    if (currentUserId && u.userId === currentUserId) {
      setActionError("You cannot disable your own account.");
      return;
    }
    const currentlyDisabled = (u.accountStatus || "") === "Disabled";
    const nextDisabled = !currentlyDisabled;
    const ok = window.confirm(
      currentlyDisabled
        ? "Enable this account?"
        : "Disable this account? It will not be able to sign in."
    );
    if (!ok) return;

    setActionBusy(true);
    setActionError("");
    try {
      const updated = await adminSetUserStatus(u.userId, { disabled: nextDisabled });
      setUsers((prev) => prev.map((row) => (row.userId === updated.userId ? updated : row)));
      setDetailsUser((prev) => (prev && prev.userId === updated.userId ? updated : prev));
      setSelectedUser((prev) => (prev && prev.userId === updated.userId ? updated : prev));
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to update account status.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!u) return;
    if ((u.role || "").toUpperCase() === "ADMIN") {
      setActionError("Admin accounts cannot be deleted.");
      return;
    }
    const ok = window.confirm(`Delete ${u.name || u.email || "this user"} permanently?`);
    if (!ok) return;
    setActionBusy(true);
    setActionError("");
    try {
      await adminDeleteUser(u.userId);
      setDetailsUser((prev) => (prev && prev.userId === u.userId ? null : prev));
      setEditPanelOpen(false);
      setSelectedUser((prev) => (prev && prev.userId === u.userId ? null : prev));
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to delete user.");
    } finally {
      setActionBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (users || []).filter((u) => {
      if (roleFilter !== "ALL" && (u.role || "") !== roleFilter) return false;
      if (providerFilter !== "ALL" && (u.provider || "") !== providerFilter) return false;
      if (statusFilter !== "ALL" && (u.accountStatus || "") !== statusFilter) return false;

      if (!q) return true;
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, search, roleFilter, providerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const summary = useMemo(() => {
    const rows = Array.isArray(users) ? users : [];
    const totalUsers = rows.length;
    const admins = rows.filter((u) => String(u.role || "").toUpperCase() === "ADMIN").length;
    const technicians = rows.filter((u) => String(u.role || "").toUpperCase() === "TECHNICIAN").length;
    const activeUsers = rows.filter((u) => String(u.accountStatus || "").toUpperCase() !== "DISABLED").length;
    const suspendedUsers = rows.filter((u) => String(u.accountStatus || "").toUpperCase() === "DISABLED").length;
    const googleUsers = rows.filter((u) => String(u.provider || "") === "Google OAuth").length;
    return { totalUsers, admins, technicians, activeUsers, suspendedUsers, googleUsers };
  }, [users]);

  const roleChartData = useMemo(() => {
    const rows = Array.isArray(users) ? users : [];
    const adminCount = rows.filter((u) => String(u.role || "").toUpperCase() === "ADMIN").length;
    const technicianCount = rows.filter((u) => String(u.role || "").toUpperCase() === "TECHNICIAN").length;
    const userCount = rows.filter((u) => {
      const role = String(u.role || "").toUpperCase();
      return role !== "ADMIN" && role !== "TECHNICIAN";
    }).length;
    return [
      { name: "ADMIN", value: adminCount, color: "#1565c0" },
      { name: "TECHNICIAN", value: technicianCount, color: "#2e7d32" },
      { name: "USER", value: userCount, color: "#FA8112" },
    ];
  }, [users]);

  const growthChartData = useMemo(() => {
    const rows = Array.isArray(users) ? users : [];
    const validDates = rows.map((u) => toDateSafe(u.createdDate)).filter(Boolean);
    if (!validDates.length) return [];
    const oldestMs = Math.min(...validDates.map((d) => d.getTime()));
    const spanDays = Math.max(1, Math.round((Date.now() - oldestMs) / 86400000));
    const byMonth = spanDays > 120;

    const counts = {};
    rows.forEach((u) => {
      const key = byMonth ? monthKey(u.createdDate) : dayKey(u.createdDate);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });

    const keys = Object.keys(counts).sort();
    return keys.map((k) => ({
      period: byMonth ? k : k.slice(5),
      newUsers: counts[k],
      fullKey: k,
    }));
  }, [users]);

  const activeSuspendedChartData = useMemo(
    () => [
      { name: "Active", count: summary.activeUsers, color: "#388e3c" },
      { name: "Suspended", count: summary.suspendedUsers, color: "#d32f2f" },
    ],
    [summary.activeUsers, summary.suspendedUsers]
  );

  const loginActivityChartData = useMemo(() => {
    const rows = Array.isArray(users) ? users : [];
    const days = [];
    const map = {};
    const today = new Date();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(today.getDate() - i);
      const key = dayKey(d);
      if (!key) continue;
      const item = {
        key,
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        logins: 0,
        activeUsers: summary.activeUsers,
      };
      days.push(item);
      map[key] = item;
    }
    rows.forEach((u) => {
      const key = dayKey(u.lastLogin);
      if (!key || !map[key]) return;
      map[key].logins += 1;
    });
    return days;
  }, [users, summary.activeUsers]);

  const topActiveUsersChartData = useMemo(() => {
    const now = Date.now();
    const rows = Array.isArray(users) ? users : [];
    return rows
      .filter((u) => toDateSafe(u.lastLogin))
      .map((u) => {
        const last = toDateSafe(u.lastLogin);
        const hoursSince = last ? Math.max(0, (now - last.getTime()) / 3600000) : 9999;
        // Recency score: 100 when very recent, tapers down over ~7 days.
        const score = Math.max(0, Math.round((1 - Math.min(hoursSince, 168) / 168) * 100));
        const shortName =
          String(u.name || u.email || "User")
            .trim()
            .split(" ")[0]
            .slice(0, 14) || "User";
        return {
          user: shortName,
          score,
          lastLoginLabel: formatDate(u.lastLogin) || "—",
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);
  }, [users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, providerFilter, statusFilter, refreshKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    const next = tab === "details" || tab === "all-users" ? "allUsers" : "dashboard";
    setMainTab(next);
  }, [location.search]);

  return (
    <div style={pageCardStyle}>
      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #14213D" }}>
            <div style={summaryLabelStyle}>Total Users</div>
            <div style={summaryValueStyle}>{summary.totalUsers}</div>
          </div>
          <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #1565c0" }}>
            <div style={summaryLabelStyle}>Admins</div>
            <div style={summaryValueStyle}>{summary.admins}</div>
          </div>
          <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #2e7d32" }}>
            <div style={summaryLabelStyle}>Technicians</div>
            <div style={summaryValueStyle}>{summary.technicians}</div>
          </div>
          <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #388e3c" }}>
            <div style={summaryLabelStyle}>Active Users</div>
            <div style={summaryValueStyle}>{summary.activeUsers}</div>
          </div>
          <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #d32f2f" }}>
            <div style={summaryLabelStyle}>Suspended Users</div>
            <div style={summaryValueStyle}>{summary.suspendedUsers}</div>
          </div>
          <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #FCA311" }}>
            <div style={summaryLabelStyle}>Google Users</div>
            <div style={summaryValueStyle}>{summary.googleUsers}</div>
          </div>
        </div>
      )}

      {loading && <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Loading users…</p>}
      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 900 }}>{error}</p>}

      {!loading && !error && mainTab === "dashboard" && (
        <div
          role="tabpanel"
          style={{
            border: `1px solid ${BORDER_LIGHT_ORANGE}`,
            borderRadius: 12,
            padding: "18px",
            background: "#f8fafc",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, color: "#14213D", marginBottom: 4 }}>User analytics overview</div>
          <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#64748b", fontWeight: 600, lineHeight: 1.5 }}>
            Role distribution, growth trend, account status split, and recent login activity.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 14,
              alignItems: "stretch",
            }}
          >
            <div style={{ border: `1px solid ${BORDER_LIGHT_ORANGE}`, borderRadius: 12, background: "#fff", padding: 12, minHeight: 290 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Users by role</div>
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={roleChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {roleChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <Label
                        position="center"
                        content={({ viewBox }) => {
                          const cx = viewBox?.cx ?? 0;
                          const cy = viewBox?.cy ?? 0;
                          const totalText = String(summary.totalUsers);
                          const totalFontSize = totalText.length >= 4 ? 24 : totalText.length === 3 ? 30 : 38;
                          return (
                            <g>
                              <text
                                x={cx}
                                y={cy - 12}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                              >
                                Total
                              </text>
                              <text
                                x={cx}
                                y={cy + 16}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ fill: "#14213D", fontSize: totalFontSize, fontWeight: 900 }}
                              >
                                {totalText}
                              </text>
                            </g>
                          );
                        }}
                      />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ border: `1px solid ${BORDER_LIGHT_ORANGE}`, borderRadius: 12, background: "#fff", padding: 12, minHeight: 290 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>User growth over time</div>
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <LineChart data={growthChartData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="newUsers" stroke="#1565c0" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ border: `1px solid ${BORDER_LIGHT_ORANGE}`, borderRadius: 12, background: "#fff", padding: 12, minHeight: 290 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Active vs suspended users</div>
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <BarChart data={activeSuspendedChartData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {activeSuspendedChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ border: `1px solid ${BORDER_LIGHT_ORANGE}`, borderRadius: 12, background: "#fff", padding: 12, minHeight: 290 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>User activity / login frequency</div>
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <BarChart data={loginActivityChartData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="logins" name="Logins per day" fill="#FA8112" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="activeUsers" name="Active users" fill="#2e7d32" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ border: `1px solid ${BORDER_LIGHT_ORANGE}`, borderRadius: 12, background: "#fff", padding: 12, minHeight: 300 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>Top active users (leaderboard)</div>
              <p style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: 12, fontWeight: 600 }}>
                Ranked by recent login activity (more recent logins score higher).
              </p>
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer>
                  <BarChart data={topActiveUsersChartData} layout="vertical" margin={{ top: 8, right: 12, left: 16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="user" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}`, "Activity score"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.lastLoginLabel || ""} />
                    <Bar dataKey="score" fill="#14213D" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && mainTab === "allUsers" && (
      <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) 170px 170px 170px 150px",
          gap: 12,
          alignItems: "end",
          marginBottom: 10,
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${BORDER_LIGHT_ORANGE}`,
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${BORDER_LIGHT_ORANGE}`,
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          >
            <option value="ALL">All</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TECHNICIAN">TECHNICIAN</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Provider</label>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${BORDER_LIGHT_ORANGE}`,
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          >
            <option value="ALL">All</option>
            <option value="Google OAuth">Google OAuth</option>
            <option value="Email">Email</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Account Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${BORDER_LIGHT_ORANGE}`,
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          >
            <option value="ALL">All</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Add User</label>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setAddUserMenuOpen((v) => !v)}
              style={{ ...smallBtnStyle("neutral"), width: "100%", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              aria-haspopup="menu"
              aria-expanded={addUserMenuOpen}
            >
              <span>Add User</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{addUserMenuOpen ? "▲" : "▼"}</span>
            </button>
            {addUserMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  background: "#fff",
                  border: `1px solid ${BORDER_LIGHT_ORANGE}`,
                  borderRadius: 10,
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddUserMenuOpen(false);
                    onAddTechnician?.("ADMIN");
                  }}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: `1px solid ${BORDER_LIGHT_ORANGE}`, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                >
                  ADMIN
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddUserMenuOpen(false);
                    onAddTechnician?.("TECHNICIAN");
                  }}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                >
                  TECHNICIAN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }} />

          <section style={userTableSectionStyle} role="tabpanel">
            <div style={userTableScrollWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Email verified</th>
                  <th style={thStyle}>Account Status</th>
                  <th style={thStyle}>Provider</th>
                  <th style={thStyle}>Created Date</th>
                  <th style={thStyle}>Last Login</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={9}>
                      No users found.
                    </td>
                  </tr>
                )}
                {pagedRows.map((u) => (
                  <tr
                    key={u.userId}
                    style={rowStyle(hoveredRowId === u.userId)}
                    onMouseEnter={() => setHoveredRowId(u.userId)}
                    onMouseLeave={() => setHoveredRowId("")}
                  >
                    <td style={tdStyle}>{u.name || "—"}</td>
                    <td style={tdStyle}>{u.email || "—"}</td>
                    <td style={tdStyle}>
                      <Badge text={u.role || "USER"} style={roleBadgeStyle(u.role)} />
                    </td>
                    <td style={tdStyle}>{emailVerifiedDisplay(u)}</td>
                    <td style={tdStyle}>
                      <Badge
                        text={(u.accountStatus || "").toUpperCase() === "DISABLED" ? "Suspended" : "Active"}
                        style={statusBadgeStyle(u.accountStatus)}
                      />
                    </td>
                    <td style={tdStyle}>{u.provider || "—"}</td>
                    <td style={tdStyle}>{formatDate(u.createdDate) || "—"}</td>
                    <td style={tdStyle}>{formatDate(u.lastLogin) || "—"}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          style={{
                            ...userTableViewBtnStyle,
                            opacity: actionBusy ? 0.5 : 1,
                            cursor: actionBusy ? "not-allowed" : "pointer",
                          }}
                          disabled={actionBusy}
                          title="View details"
                          onClick={() => {
                            setDetailsUser(u);
                          }}
                        >
                          View
                        </button>
                        {(() => {
                          const isAdminRow = (u.role || "").toUpperCase() === "ADMIN";
                          const isSelf = currentUserId && u.userId === currentUserId;
                          const canToggle = !isAdminRow && !isSelf;
                          const isSuspended = (u.accountStatus || "") === "Disabled";
                          const toggleTitle = isAdminRow
                            ? "Admin account cannot be deactivated"
                            : isSelf
                              ? "You cannot disable your own account"
                              : isSuspended
                                ? "Activate account"
                                : "Deactivate account";
                          return (
                            <button
                              type="button"
                              style={
                                !canToggle
                                  ? { ...smallBtnStyle("neutral"), opacity: 0.55, cursor: "not-allowed" }
                                  : isSuspended
                                    ? smallBtnStyle("primary")
                                    : smallBtnStyle("danger")
                              }
                              disabled={actionBusy || !canToggle}
                              title={toggleTitle}
                              onClick={() => handleToggleDisabled(u)}
                            >
                              {isSuspended ? "Activate" : "Deactivate"}
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          {filtered.length > 0 && (
            <div style={userTablePaginationFooterStyle}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Showing {(safePage - 1) * PAGE_SIZE + 1}-
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} users • {PAGE_SIZE} per page
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{ ...smallBtnStyle("neutral"), opacity: safePage <= 1 ? 0.5 : 1 }}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-current={safePage === page ? "page" : undefined}
                    style={{
                      ...smallBtnStyle(safePage === page ? "primary" : "neutral"),
                      minWidth: 34,
                      fontWeight: 900,
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{ ...smallBtnStyle("neutral"), opacity: safePage >= totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </section>
      </>
      )}

      {detailsUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1001,
            backgroundColor: "rgba(15, 23, 42, 0.30)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            paddingTop: "34px",
            paddingBottom: "34px",
            paddingRight: "20px",
            boxSizing: "border-box",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailsUser(null);
          }}
        >
          <div style={{ display: "flex", maxHeight: "calc(100vh - 68px)", justifyContent: "flex-end", gap: 12, alignItems: "flex-start" }}>
            {editPanelOpen && selectedUser && (
              <div
                style={{
                  width: "min(500px, calc(100vw - 40px))",
                  maxHeight: "calc(100vh - 68px)",
                  background: "rgba(255, 255, 255, 0.90)",
                  backdropFilter: "blur(8px)",
                  borderLeft: `1px solid ${BORDER_LIGHT_ORANGE}`,
                  borderRadius: "18px",
                  boxShadow: "-8px 12px 34px rgba(15, 23, 42, 0.16)",
                  padding: "20px 18px 18px",
                  boxSizing: "border-box",
                  overflowY: "auto",
                  animation: "adminUserDetailsSlideIn 0.2s ease-out",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Edit User</div>
                  <button
                    type="button"
                    onClick={() => setEditPanelOpen(false)}
                    style={{ ...iconBtnStyle("neutral"), width: 30, height: 30 }}
                    aria-label="Close edit panel"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditSave();
                  }}
                  style={{ marginTop: 14, display: "grid", gap: 14 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        First name
                      </label>
                      <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} style={modalInputStyle} placeholder="First name" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        Last name
                      </label>
                      <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} style={modalInputStyle} placeholder="Last name" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                      Email {String(selectedUser.provider || "") === "Google OAuth" ? <span style={{ fontWeight: 500, color: "#9ca3af" }}>(read-only for Google OAuth)</span> : null}
                    </label>
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      readOnly={String(selectedUser.provider || "") === "Google OAuth"}
                      style={{
                        ...modalInputStyle,
                        backgroundColor: String(selectedUser.provider || "") === "Google OAuth" ? "#f8fafc" : "#fff",
                        color: String(selectedUser.provider || "") === "Google OAuth" ? "#475569" : "#0f172a",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        Role
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        disabled={String(selectedUser.role || "").toUpperCase() === "ADMIN"}
                        style={{ ...modalInputStyle, cursor: "pointer", backgroundColor: String(selectedUser.role || "").toUpperCase() === "ADMIN" ? "#f8fafc" : "#fff" }}
                      >
                        <option value="USER">USER</option>
                        <option value="TECHNICIAN">TECHNICIAN</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        Account status
                      </label>
                      <select
                        value={editAccountStatus}
                        onChange={(e) => setEditAccountStatus(e.target.value)}
                        disabled={String(selectedUser.role || "").toUpperCase() === "ADMIN" || (currentUserId && selectedUser.userId === currentUserId)}
                        style={{ ...modalInputStyle, cursor: "pointer", backgroundColor: (String(selectedUser.role || "").toUpperCase() === "ADMIN" || (currentUserId && selectedUser.userId === currentUserId)) ? "#f8fafc" : "#fff" }}
                      >
                        <option value="Active">Active</option>
                        <option value="Disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        Provider <span style={{ fontWeight: 500, color: "#9ca3af" }}>(read-only)</span>
                      </label>
                      <input value={selectedUser.provider || ""} readOnly style={{ ...modalInputStyle, backgroundColor: "#f8fafc", color: "#475569" }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                      Phone number <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={PROFILE_PHONE_DIGITS}
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(sanitizeProfilePhoneInput(e.target.value))}
                      style={modalInputStyle}
                      placeholder="0771234567"
                    />
                    <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                      Optional. {PROFILE_PHONE_DIGITS} digits only.
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        User ID <span style={{ fontWeight: 500, color: "#9ca3af" }}>(read-only)</span>
                      </label>
                      <input value={selectedUser.userId || ""} readOnly style={{ ...modalInputStyle, backgroundColor: "#f8fafc", color: "#475569" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        Created date <span style={{ fontWeight: 500, color: "#9ca3af" }}>(read-only)</span>
                      </label>
                      <input value={formatDate(selectedUser.createdDate) || "—"} readOnly style={{ ...modalInputStyle, backgroundColor: "#f8fafc", color: "#475569" }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                      Last login <span style={{ fontWeight: 500, color: "#9ca3af" }}>(read-only)</span>
                    </label>
                    <input value={formatDate(selectedUser.lastLogin) || "—"} readOnly style={{ ...modalInputStyle, backgroundColor: "#f8fafc", color: "#475569" }} />
                  </div>

                  {(selectedUser.provider || "") !== "Google OAuth" ? (
                    <div style={{ border: `1px solid ${BORDER_LIGHT_ORANGE}`, borderRadius: 12, padding: 10, background: "#fff" }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Password reset</div>
                      <input
                        type="password"
                        value={resetPasswordDraft}
                        onChange={(e) => setResetPasswordDraft(e.target.value)}
                        style={modalInputStyle}
                        placeholder="Set temporary password"
                        disabled={String(selectedUser.role || "").toUpperCase() !== "TECHNICIAN"}
                      />
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                          Only Email-provider technicians can be reset by admin.
                        </p>
                        <button
                          type="button"
                          onClick={handleAdminPasswordReset}
                          disabled={resetBusy || String(selectedUser.role || "").toUpperCase() !== "TECHNICIAN"}
                          style={{ ...smallBtnStyle("danger"), opacity: resetBusy ? 0.8 : 1 }}
                        >
                          {resetBusy ? "Resetting..." : "Reset Password"}
                        </button>
                      </div>
                      {resetMessage ? (
                        <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: resetMessage.toLowerCase().includes("success") ? "#166534" : "#b91c1c" }}>
                          {resetMessage}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {actionError && (
                    <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 900 }}>{actionError}</p>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button type="button" onClick={() => setEditPanelOpen(false)} style={smallBtnStyle("neutral")}>Cancel</button>
                    <button type="submit" disabled={actionBusy} style={{ ...smallBtnStyle("primary"), opacity: actionBusy ? 0.85 : 1 }}>
                      {actionBusy ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div
              style={{
                width: "min(420px, calc(100vw - 40px))",
                maxHeight: "calc(100vh - 68px)",
                background: "rgba(255, 255, 255, 0.90)",
                backdropFilter: "blur(8px)",
                borderLeft: `1px solid ${BORDER_LIGHT_ORANGE}`,
                borderRadius: "18px",
                boxShadow: "-8px 12px 34px rgba(15, 23, 42, 0.18)",
                padding: "20px 18px 18px",
                boxSizing: "border-box",
                overflowY: "auto",
                animation: "adminUserDetailsSlideIn 0.2s ease-out",
              }}
            >
            <style>{`@keyframes adminUserDetailsSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>User Details</div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsUser(null)}
                style={{ ...iconBtnStyle("neutral"), width: 30, height: 30 }}
                aria-label="Close details panel"
              >
                <CloseIcon />
              </button>
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#475569",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {String(detailsUser.name || detailsUser.email || "U").trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{detailsUser.name || "—"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <Badge text={detailsUser.role || "USER"} style={roleBadgeStyle(detailsUser.role)} />
                  <Badge
                    text={(detailsUser.accountStatus || "").toUpperCase() === "DISABLED" ? "Suspended" : "Active"}
                    style={statusBadgeStyle(detailsUser.accountStatus)}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 10,
                background: "rgba(255,255,255,0.75)",
                border: `1px solid ${BORDER_LIGHT_ORANGE}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div><strong style={{ color: "#0f172a" }}>Email:</strong> {detailsUser.email || "—"}</div>
              {String(detailsUser.role || "").toUpperCase() === "TECHNICIAN" ||
              String(detailsUser.provider || "").toLowerCase().includes("google") ? (
                <div>
                  <strong style={{ color: "#0f172a" }}>Email verified:</strong> {emailVerifiedDisplay(detailsUser)}
                </div>
              ) : null}
              <div><strong style={{ color: "#0f172a" }}>Provider:</strong> {detailsUser.provider || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>Created date:</strong> {formatDate(detailsUser.createdDate) || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>Last login:</strong> {formatDate(detailsUser.lastLogin) || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>User ID:</strong> {detailsUser.userId || "—"}</div>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                style={smallBtnStyle("primary")}
                onClick={() => {
                  setSelectedUser(detailsUser);
                  setEditPanelOpen(true);
                }}
              >
                Edit User
              </button>
              <button
                type="button"
                style={smallBtnStyle((detailsUser.accountStatus || "") === "Disabled" ? "primary" : "danger")}
                disabled={actionBusy || (detailsUser.role || "").toUpperCase() === "ADMIN" || (currentUserId && detailsUser.userId === currentUserId)}
                title={(detailsUser.role || "").toUpperCase() === "ADMIN" ? "Admin account cannot be deactivated" : "Toggle account status"}
                onClick={() => handleToggleDisabled(detailsUser)}
              >
                {(detailsUser.accountStatus || "") === "Disabled" ? "Activate" : "Deactivate"}
              </button>
              {(detailsUser.role || "").toUpperCase() !== "ADMIN" ? (
                <button
                  type="button"
                  style={smallBtnStyle("danger")}
                  disabled={actionBusy}
                  onClick={() => handleDeleteUser(detailsUser)}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <DeleteIcon />
                    Delete
                  </span>
                </button>
              ) : null}
            </div>
            {actionError && <p style={{ marginTop: 10, marginBottom: 0, color: "#b91c1c", fontSize: 13, fontWeight: 800 }}>{actionError}</p>}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

