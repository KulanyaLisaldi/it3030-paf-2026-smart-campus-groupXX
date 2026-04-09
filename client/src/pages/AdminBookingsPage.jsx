import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import { appFontFamily } from "../utils/appFont";
import { cancelBookingByAdmin, deleteBookingByAdmin, getAdminBookings, approveBookingByAdmin, rejectBookingByAdmin } from "../api/bookings";
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

const panelStyle = { backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #FFDDB8", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", padding: "14px" };
const dashboardChartsGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 12, rowGap: 36 };
const dashboardChartCardStyle = {
  border: "1px solid #FFDDB8",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
  minHeight: 300,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05)",
};

/** Stat cards: cream border + colored left bar (aligned with admin resource metric cards). */
const bookingStatCardBaseStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px",
  minHeight: 76,
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};
const bookingStatLabelStyle = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const bookingStatValueStyle = { margin: "8px 0 0", fontSize: "26px", fontWeight: 800, color: "#14213D", lineHeight: 1 };
const inputStyle = { width: "100%", height: 40, borderRadius: 10, border: "1px solid #FFDDB8", padding: "0 10px", boxSizing: "border-box", fontSize: 14 };
const buttonStyle = { height: 38, borderRadius: 9, border: "none", padding: "0 12px", fontWeight: 700, cursor: "pointer" };
const actionControlStyle = { height: 32, width: 108, borderRadius: 8, fontSize: 12, boxSizing: "border-box" };
const chartPalette = {
  navy: "#14213D",
  green: "#16a34a",
  amber: "#FCA311",
  red: "#d32f2f",
  gray: "#6b7280",
};

function statusChip(statusRaw) {
  const status = String(statusRaw || "").toUpperCase();
  if (status === "CHECKED_IN") return { background: "#ccfbf1", color: "#0f766e" };
  if (status === "APPROVED") return { background: "#dcfce7", color: "#166534" };
  if (status === "REJECTED") return { background: "#fee2e2", color: "#b91c1c" };
  if (status === "CANCELLED") return { background: "#e5e7eb", color: "#374151" };
  return { background: "#ffedd5", color: "#9a3412" };
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function canApprove(status) {
  return String(status || "").toUpperCase() === "PENDING";
}
function canReject(status) {
  return String(status || "").toUpperCase() === "PENDING";
}
function canCancel(status) {
  const s = String(status || "").toUpperCase();
  return s === "APPROVED";
}
function canDelete(status) {
  const s = String(status || "").toUpperCase();
  return s === "REJECTED" || s === "CANCELLED";
}
function cancellationOrRejectionReason(row) {
  const status = String(row?.status || "").toUpperCase();
  if (status === "REJECTED") return row?.reviewReason || "";
  if (status === "CANCELLED") return row?.cancellationReason || row?.reviewReason || "";
  return row?.reviewReason || row?.cancellationReason || "";
}
function cancellationOrRejectionLabel(row) {
  const status = String(row?.status || "").toUpperCase();
  if (status === "REJECTED") return "Admin rejection reason";
  if (status === "CANCELLED") return row?.cancellationReason ? "User cancellation reason" : "Admin cancellation reason";
  return "Reason";
}

function countByStatus(rows) {
  const counts = { total: rows.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  rows.forEach((row) => {
    const s = String(row?.status || "").toUpperCase();
    if (s === "PENDING") counts.pending += 1;
    if (s === "APPROVED") counts.approved += 1;
    if (s === "REJECTED") counts.rejected += 1;
    if (s === "CANCELLED") counts.cancelled += 1;
  });
  return counts;
}

function normalizeResourceType(value) {
  const upper = String(value || "").toUpperCase().replace(/\s+/g, "_").trim();
  if (!upper) return "UNKNOWN";
  return upper;
}

function formatTrendLabel(date, mode) {
  if (mode === "DAY") return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (mode === "WEEK") return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString(undefined, { month: "short" })}`;
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function formatHourLabel(startTime) {
  const [hRaw] = String(startTime || "").split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h)) return "Unknown";
  const suffix = h >= 12 ? "PM" : "AM";
  const normalized = h % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [actionModal, setActionModal] = useState({ type: "", row: null, reason: "", error: "" });
  const [filters, setFilters] = useState({
    status: "ALL",
    date: "",
    resourceType: "ALL",
    resource: "",
    user: "",
    approvalState: "ALL",
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [detailsPage, setDetailsPage] = useState(1);
  const [detailsPageSize, setDetailsPageSize] = useState(20);
  const [trendMode, setTrendMode] = useState("DAY");
  const [calendarDateFilter, setCalendarDateFilter] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarDetailsDate, setCalendarDetailsDate] = useState("");

  const loadRows = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminBookings(nextFilters);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(filters);
  }, [filters]);
  useEffect(() => {
    setDetailsPage(1);
  }, [filters]);
  useEffect(() => {
    const tab = (new URLSearchParams(location.search).get("tab") || "overview").toLowerCase();
    if (tab === "calendar") {
      setActiveTab("calendar");
      return;
    }
    if (tab === "details") {
      setActiveTab("details");
      return;
    }
    setActiveTab("dashboard");
  }, [location.search]);

  const resourceTypes = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const t = String(r.resourceType || "").trim().toUpperCase();
      if (t) set.add(t);
    });
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  const statusCounts = useMemo(() => countByStatus(rows), [rows]);
  const statusChartData = useMemo(
    () => [
      { name: "Pending", value: statusCounts.pending, color: "#FA8112" },
      { name: "Approved", value: statusCounts.approved, color: chartPalette.green },
      { name: "Rejected", value: statusCounts.rejected, color: chartPalette.red },
      { name: "Cancelled", value: statusCounts.cancelled, color: chartPalette.gray },
    ],
    [statusCounts]
  );

  const bookingsTrendData = useMemo(() => {
    const now = new Date();
    const keyMap = new Map();
    if (trendMode === "DAY") {
      for (let i = 13; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        keyMap.set(key, { label: formatTrendLabel(d, "DAY"), count: 0 });
      }
      rows.forEach((r) => {
        const key = String(r?.bookingDate || "");
        if (keyMap.has(key)) keyMap.get(key).count += 1;
      });
      return Array.from(keyMap.values());
    }
    if (trendMode === "WEEK") {
      for (let i = 7; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(now.getDate() - i * 7);
        const year = d.getFullYear();
        const month = d.getMonth();
        const week = Math.ceil(d.getDate() / 7);
        const key = `${year}-${month + 1}-W${week}`;
        keyMap.set(key, { label: formatTrendLabel(d, "WEEK"), count: 0 });
      }
      rows.forEach((r) => {
        const d = new Date(`${r?.bookingDate || ""}T00:00:00`);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-W${Math.ceil(d.getDate() / 7)}`;
        if (keyMap.has(key)) keyMap.get(key).count += 1;
      });
      return Array.from(keyMap.values());
    }
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      keyMap.set(key, { label: formatTrendLabel(d, "MONTH"), count: 0 });
    }
    rows.forEach((r) => {
      const d = new Date(`${r?.bookingDate || ""}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (keyMap.has(key)) keyMap.get(key).count += 1;
    });
    return Array.from(keyMap.values());
  }, [rows, trendMode]);

  const resourceTypeChartData = useMemo(() => {
    const tracked = ["LAB", "LECTURE_HALL", "MEETING_ROOM", "EQUIPMENT"];
    const counts = Object.fromEntries(tracked.map((t) => [t, 0]));
    rows.forEach((r) => {
      const key = normalizeResourceType(r?.resourceType);
      if (counts[key] != null) counts[key] += 1;
    });
    return tracked.map((key) => ({ type: key, count: counts[key] }));
  }, [rows]);

  const topResourcesChartData = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const name = String(r?.resourceName || "Unknown").trim() || "Unknown";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  const decisionByTypeChartData = useMemo(() => {
    const tracked = ["LAB", "LECTURE_HALL", "MEETING_ROOM", "EQUIPMENT"];
    const seed = { approved: 0, rejected: 0, cancelled: 0, pending: 0 };
    const map = new Map(tracked.map((t) => [t, { ...seed }]));
    rows.forEach((r) => {
      const type = normalizeResourceType(r?.resourceType);
      if (!map.has(type)) map.set(type, { ...seed });
      const status = String(r?.status || "").toUpperCase();
      const obj = map.get(type);
      if (status === "APPROVED") obj.approved += 1;
      else if (status === "REJECTED") obj.rejected += 1;
      else if (status === "CANCELLED") obj.cancelled += 1;
      else obj.pending += 1;
    });
    return Array.from(map.entries()).map(([type, v]) => ({ type, ...v }));
  }, [rows]);

  const peakHoursChartData = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const label = formatHourLabel(r?.startTime);
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([hour, count]) => ({ hour, count, sort: toSortHour(hour) }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ hour, count }) => ({ hour, count }));
  }, [rows]);

  const approvedDateSet = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (String(r?.status || "").toUpperCase() !== "APPROVED") return;
      const date = String(r?.bookingDate || "").trim();
      if (date) set.add(date);
    });
    return set;
  }, [rows]);

  const approvedCountByDate = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (String(r?.status || "").toUpperCase() !== "APPROVED") return;
      const date = String(r?.bookingDate || "").trim();
      if (!date) return;
      map.set(date, (map.get(date) || 0) + 1);
    });
    return map;
  }, [rows]);

  const approvedRowsByDate = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (String(r?.status || "").toUpperCase() !== "APPROVED") return;
      const date = String(r?.bookingDate || "").trim();
      if (!date) return;
      const list = map.get(date) || [];
      list.push(r);
      map.set(date, list);
    });
    return map;
  }, [rows]);

  const calendarCells = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startWeekDay = monthStart.getDay();
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startWeekDay);
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      cells.push({
        iso,
        day: d.getDate(),
        inCurrentMonth: monthKey(d) === monthKey(calendarMonth),
        approved: approvedDateSet.has(iso),
        approvedCount: approvedCountByDate.get(iso) || 0,
      });
    }
    return cells;
  }, [calendarMonth, approvedDateSet, approvedCountByDate]);

  const detailsTotalPages = useMemo(() => {
    const safePageSize = Math.max(1, Number(detailsPageSize) || 20);
    return Math.max(1, Math.ceil(rows.length / safePageSize));
  }, [rows.length, detailsPageSize]);
  useEffect(() => {
    if (detailsPage > detailsTotalPages) setDetailsPage(detailsTotalPages);
  }, [detailsPage, detailsTotalPages]);
  const paginatedDetailsRows = useMemo(() => {
    const safePageSize = Math.max(1, Number(detailsPageSize) || 20);
    const start = (detailsPage - 1) * safePageSize;
    return rows.slice(start, start + safePageSize);
  }, [rows, detailsPage, detailsPageSize]);

  function toSortHour(label) {
    const m = String(label).match(/^(\d+):00\s(AM|PM)$/);
    if (!m) return 999;
    let h = Number(m[1]);
    if (m[2] === "PM" && h !== 12) h += 12;
    if (m[2] === "AM" && h === 12) h = 0;
    return h;
  }

  const openAction = (type, row) => setActionModal({ type, row, reason: "", error: "" });
  const closeAction = () => setActionModal({ type: "", row: null, reason: "", error: "" });

  const handleApproveDirect = async (row) => {
    if (!row?.id || !canApprove(row.status)) return;
    setBusyId(row.id);
    try {
      const response = await approveBookingByAdmin(row.id, "");
      const updated = response?.booking;
      if (updated?.id) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        if (viewRow?.id === updated.id) setViewRow((v) => ({ ...v, ...updated }));
      } else {
        await loadRows();
      }
    } catch (e) {
      setError(e?.message || "Could not approve booking.");
    } finally {
      setBusyId("");
    }
  };

  const handleConfirmAction = async () => {
    const row = actionModal.row;
    if (!row?.id) return;
    const reason = (actionModal.reason || "").trim();
    if (actionModal.type === "reject" && !reason) {
      setActionModal((s) => ({ ...s, error: "Rejection reason is required." }));
      return;
    }
    if (actionModal.type === "cancel" && !reason) {
      setActionModal((s) => ({ ...s, error: "Cancellation reason is required." }));
      return;
    }
    setBusyId(row.id);
    try {
      let response = null;
      if (actionModal.type === "reject") response = await rejectBookingByAdmin(row.id, reason);
      if (actionModal.type === "cancel") response = await cancelBookingByAdmin(row.id, reason);
      if (actionModal.type === "delete") response = await deleteBookingByAdmin(row.id);
      const updated = response?.booking;
      if (actionModal.type === "delete") {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        if (viewRow?.id === row.id) setViewRow(null);
      } else if (updated?.id) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        if (viewRow?.id === updated.id) setViewRow((v) => ({ ...v, ...updated }));
      } else {
        await loadRows();
      }
      closeAction();
    } catch (e) {
      setActionModal((s) => ({ ...s, error: e?.message || "Action failed." }));
    } finally {
      setBusyId("");
    }
  };

  return (
    <AdminLayout activeSection="bookings" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>Booking Management</h1>
        <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>
          Review booking requests, approve/reject decisions, monitor conflicts, and manage booking lifecycle.
        </p>
        <section style={panelStyle}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 38 }}>
            {[
              { label: "Total Bookings", value: statusCounts.total, accent: "#14213D" },
              { label: "Pending", value: statusCounts.pending, accent: "#FA8112" },
              { label: "Approved", value: statusCounts.approved, accent: "#16a34a" },
              { label: "Rejected", value: statusCounts.rejected, accent: "#d32f2f" },
              { label: "Cancelled", value: statusCounts.cancelled, accent: "#6b7280" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  ...bookingStatCardBaseStyle,
                  borderLeft: `6px solid ${card.accent}`,
                }}
              >
                <p style={bookingStatLabelStyle}>{card.label}</p>
                <p style={bookingStatValueStyle}>{card.value}</p>
              </div>
            ))}
          </div>

          {activeTab === "dashboard" && (
            <div>
              <div style={dashboardChartsGridStyle}>
                <div style={dashboardChartCardStyle}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Bookings by Status</h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={2}>
                          {statusChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                          <Label
                            position="center"
                            content={({ viewBox }) => {
                              if (!viewBox || viewBox.cx == null || viewBox.cy == null) return null;
                              const cx = viewBox.cx;
                              const cy = viewBox.cy;
                              return (
                                <g>
                                  <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }}>
                                    Total
                                  </text>
                                  <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 34, fontWeight: 800, fill: "#14213D" }}>
                                    {statusCounts.total}
                                  </text>
                                </g>
                              );
                            }}
                          />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={dashboardChartCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Bookings Trend</h3>
                    <select value={trendMode} onChange={(e) => setTrendMode(e.target.value)} style={{ ...inputStyle, width: 120, height: 32 }}>
                      <option value="DAY">Day</option>
                      <option value="WEEK">Week</option>
                      <option value="MONTH">Month</option>
                    </select>
                  </div>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bookingsTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke={chartPalette.navy} strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={dashboardChartCardStyle}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Most Booked Resource Types</h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resourceTypeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <XAxis dataKey="type" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill={chartPalette.navy} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={dashboardChartCardStyle}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Top Booked Resources</h3>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topResourcesChartData} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={130} />
                        <Tooltip />
                        <Bar dataKey="count" fill={chartPalette.amber} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={dashboardChartCardStyle}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Approval Decision by Resource Type</h3>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={decisionByTypeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <XAxis dataKey="type" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="approved" stackId="a" fill={chartPalette.green} />
                        <Bar dataKey="rejected" stackId="a" fill={chartPalette.red} />
                        <Bar dataKey="cancelled" stackId="a" fill={chartPalette.gray} />
                        <Bar dataKey="pending" stackId="a" fill="#FA8112" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={dashboardChartCardStyle}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Peak Booking Hours</h3>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={peakHoursChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#FFDDB8" />
                        <XAxis dataKey="hour" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill={chartPalette.navy} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <>
      <section style={{ border: "1px solid #FFDDB8", borderRadius: 12, padding: 12, background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))} style={inputStyle}>
            <option value="ALL">Status: All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="CHECKED_IN">Checked In</option>
          </select>
          <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} style={inputStyle} />
          <select value={filters.resourceType} onChange={(e) => setFilters((s) => ({ ...s, resourceType: e.target.value }))} style={inputStyle}>
            {resourceTypes.map((t) => <option key={t} value={t}>{t === "ALL" ? "Resource Type: All" : t}</option>)}
          </select>
          <input value={filters.resource} onChange={(e) => setFilters((s) => ({ ...s, resource: e.target.value }))} style={inputStyle} placeholder="Resource name/id" />
          <input value={filters.user} onChange={(e) => setFilters((s) => ({ ...s, user: e.target.value }))} style={inputStyle} placeholder="User name/email" />
          <select value={filters.approvalState} onChange={(e) => setFilters((s) => ({ ...s, approvalState: e.target.value }))} style={inputStyle}>
            <option value="ALL">Approval State: All</option>
            <option value="UNREVIEWED">Unreviewed</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CHECKED_IN">Checked In</option>
          </select>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setFilters({ status: "ALL", date: "", resourceType: "ALL", resource: "", user: "", approvalState: "ALL" });
            }}
            style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #FFDDB8" }}
          >
            Reset
          </button>
        </div>
        {error && <p style={{ margin: "10px 0 0", color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
      </section>

      <section style={{ border: "1px solid #FFDDB8", borderRadius: 12, marginTop: 12, padding: 0, background: "#fff", overflow: "hidden" }}>
        <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "max-content", minWidth: 1160, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#334155", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {["Booked By", "Resource Name", "Resource Type", "Date", "Start Time", "End Time", "Status", "Requested On", "Actions"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "12px 10px", backgroundColor: "#FAF3E1", color: "#374151", fontWeight: 800, fontSize: "13px", borderBottom: "1px solid #F5E7C6" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 16, color: "#64748b" }}>No bookings found for the selected filters.</td></tr>
            )}
            {paginatedDetailsRows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #FFDDB8" }}>
                <td style={{ padding: "10px", fontWeight: 700, color: "#0f172a" }}>{row.userName || "—"}</td>
                <td style={{ padding: "10px" }}>{row.resourceName || "—"}</td>
                <td style={{ padding: "10px" }}>{row.resourceType || "—"}</td>
                <td style={{ padding: "10px" }}>{fmtDate(row.bookingDate)}</td>
                <td style={{ padding: "10px" }}>{row.startTime || "—"}</td>
                <td style={{ padding: "10px" }}>{row.endTime || "—"}</td>
                <td style={{ padding: "10px" }}><span style={{ ...statusChip(row.status), display: "inline-flex", padding: "4px 9px", borderRadius: 999, fontWeight: 800, fontSize: 11 }}>{row.status || "PENDING"}</span></td>
                <td style={{ padding: "10px" }}>{fmtDateTime(row.createdAt)}</td>
                <td style={{ padding: "10px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setViewRow(row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#fff", border: "1px solid #FFDDB8", color: "#0f172a", textAlign: "center" }}>View</button>
                    {canApprove(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => void handleApproveDirect(row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#16a34a", color: "#fff", textAlign: "center" }}>
                        Approve
                      </button>
                    )}
                    {canReject(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => openAction("reject", row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#dc2626", color: "#fff", textAlign: "center" }}>
                        Reject
                      </button>
                    )}
                    {canCancel(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => openAction("cancel", row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#111827", color: "#fff", textAlign: "center" }}>
                        Cancel
                      </button>
                    )}
                    {canDelete(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => openAction("delete", row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#dc2626", color: "#fff", textAlign: "center" }}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div style={{ borderTop: "1px solid #F5E7C6", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
            Showing {rows.length === 0 ? 0 : (detailsPage - 1) * detailsPageSize + 1}-{Math.min(detailsPage * detailsPageSize, rows.length)} of {rows.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Rows</label>
            <select
              value={detailsPageSize}
              onChange={(e) => {
                setDetailsPageSize(Number(e.target.value) || 20);
                setDetailsPage(1);
              }}
              style={{ ...inputStyle, width: 82, height: 32, padding: "0 8px" }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              type="button"
              disabled={detailsPage <= 1}
              onClick={() => setDetailsPage((p) => Math.max(1, p - 1))}
              style={{ ...buttonStyle, height: 32, background: detailsPage <= 1 ? "#f3f4f6" : "#fff", color: "#0f172a", border: "1px solid #FFDDB8", cursor: detailsPage <= 1 ? "not-allowed" : "pointer" }}
            >
              Prev
            </button>
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>Page {detailsPage} / {detailsTotalPages}</span>
            <button
              type="button"
              disabled={detailsPage >= detailsTotalPages}
              onClick={() => setDetailsPage((p) => Math.min(detailsTotalPages, p + 1))}
              style={{ ...buttonStyle, height: 32, background: detailsPage >= detailsTotalPages ? "#f3f4f6" : "#fff", color: "#0f172a", border: "1px solid #FFDDB8", cursor: detailsPage >= detailsTotalPages ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      </section>
            </>
          )}

          {activeTab === "calendar" && (
            <section style={{ border: "1px solid #FFDDB8", borderRadius: 12, padding: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Calendar View</h3>
                <input
                  type="date"
                  value={calendarDateFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCalendarDateFilter(value);
                    if (value) {
                      const [y, m] = value.split("-").map(Number);
                      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
                        setCalendarMonth(new Date(y, m - 1, 1));
                      }
                    }
                  }}
                  style={{ ...inputStyle, width: 190, height: 34 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#475569", fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#16a34a", display: "inline-block" }} />
                Approved booking dates
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 12, padding: "4px 0" }}>{d}</div>
                ))}
                {calendarCells.map((cell) => (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => {
                      if (!cell.approved) return;
                      setCalendarDetailsDate(cell.iso);
                    }}
                    style={{
                      minHeight: 70,
                      borderRadius: 10,
                      border: "1px solid #FFDDB8",
                      background: cell.approved ? "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)" : "#fff",
                      opacity: cell.inCurrentMonth ? 1 : 0.45,
                      padding: 6,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      textAlign: "left",
                      cursor: cell.approved ? "pointer" : "default",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{cell.day}</span>
                    {cell.approved && (
                      <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, color: "#166534", background: "#bbf7d0", borderRadius: 999, padding: "2px 6px" }}>
                        {cell.approvedCount} approved
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      {calendarDetailsDate && (
        <div role="dialog" aria-modal="true" onClick={() => setCalendarDetailsDate("")} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1320 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "760px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #FFDDB8", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#111827" }}>Approved Bookings on {fmtDate(calendarDetailsDate)}</h3>
              <button type="button" onClick={() => setCalendarDetailsDate("")} style={{ ...buttonStyle, height: 34, background: "#fff", border: "1px solid #FFDDB8", color: "#0f172a" }}>
                Close
              </button>
            </div>
            {(approvedRowsByDate.get(calendarDetailsDate) || []).length === 0 ? (
              <p style={{ margin: 0, color: "#64748b" }}>No approved bookings found for this date.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {(approvedRowsByDate.get(calendarDetailsDate) || []).map((row) => (
                  <div key={row.id} style={{ border: "1px solid #FFDDB8", borderRadius: 10, padding: "10px 12px", background: "#f8fafc" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 14, color: "#334155" }}>
                      <div><strong>Booked By:</strong> {row.userName || "—"}</div>
                      <div><strong>Resource:</strong> {row.resourceName || "—"}</div>
                      <div><strong>Type:</strong> {row.resourceType || "—"}</div>
                      <div><strong>Time:</strong> {row.startTime || "—"} - {row.endTime || "—"}</div>
                      <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {row.purpose || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {viewRow && (
        <div role="dialog" aria-modal="true" onClick={() => setViewRow(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1300 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "760px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #FFDDB8", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 21, fontWeight: 800, color: "#111827" }}>Booking Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", color: "#334155", fontSize: 14 }}>
              <div><strong>Booking ID:</strong> {viewRow.id || "—"}</div>
              <div><strong>Booked By:</strong> {viewRow.userName || "—"}</div>
              <div><strong>Resource:</strong> {viewRow.resourceName || "—"}</div>
              <div><strong>Type:</strong> {viewRow.resourceType || "—"}</div>
              <div><strong>Date:</strong> {fmtDate(viewRow.bookingDate)}</div>
              <div><strong>Time:</strong> {viewRow.startTime || "—"} - {viewRow.endTime || "—"}</div>
              <div><strong>Status:</strong> {viewRow.status || "PENDING"}</div>
              <div><strong>Requested On:</strong> {fmtDateTime(viewRow.createdAt)}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {viewRow.purpose || "—"}</div>
              <div><strong>Expected Attendees:</strong> {viewRow.expectedAttendees ?? "—"}</div>
              <div><strong>Updated On:</strong> {fmtDateTime(viewRow.updatedAt)}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>{cancellationOrRejectionLabel(viewRow)}:</strong> {cancellationOrRejectionReason(viewRow) || "—"}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Additional Notes:</strong> {viewRow.additionalNotes || "—"}</div>
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setViewRow(null)} style={{ ...buttonStyle, background: "#fff", border: "1px solid #FFDDB8", color: "#0f172a" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {actionModal.row && (
        <div role="dialog" aria-modal="true" onClick={() => (busyId ? null : closeAction())} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1350 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 14, border: "1px solid #FFDDB8", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#111827", textTransform: "capitalize" }}>{actionModal.type} Booking</h3>
            <p style={{ margin: "0 0 10px", color: "#334155", fontSize: 14 }}>
              {actionModal.type === "reject" && "Reject this booking request? Please provide a reason."}
              {actionModal.type === "cancel" && "Cancel this booking request? Please provide a reason."}
              {actionModal.type === "delete" && "Delete this cancelled booking permanently from database?"}
            </p>
            {actionModal.type !== "delete" && (
              <>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 700, color: "#111827", fontSize: 13 }}>
                  Reason (required)
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={actionModal.reason}
                  onChange={(e) => setActionModal((s) => ({ ...s, reason: e.target.value, error: "" }))}
                  style={{ width: "100%", borderRadius: 10, border: "1px solid #FFDDB8", padding: "10px 12px", boxSizing: "border-box", resize: "vertical", fontSize: 14 }}
                />
              </>
            )}
            {actionModal.error && <p style={{ margin: "8px 0 0", color: "#b91c1c", fontWeight: 700, fontSize: 13 }}>{actionModal.error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={closeAction} disabled={!!busyId} style={{ ...buttonStyle, background: "#fff", border: "1px solid #FFDDB8", color: "#0f172a" }}>Close</button>
              <button type="button" onClick={handleConfirmAction} disabled={busyId === actionModal.row.id} style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }}>{busyId === actionModal.row.id ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
