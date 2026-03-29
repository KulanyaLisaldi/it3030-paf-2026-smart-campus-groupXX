import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getTechnicianAssignedTickets } from "../api/technicianTickets";
import { getAuthToken } from "../api/http";
import { readCampusUser } from "../utils/campusUserStorage";
import { appFontFamily } from "../utils/appFont";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(180deg, #FAF3E1 0%, #FFFFFF 70%)",
  padding: "24px 16px",
  display: "flex",
  justifyContent: "center",
  fontFamily: appFontFamily,
  boxSizing: "border-box",
};

const shellStyle = {
  width: "100%",
  maxWidth: "1280px",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.08)",
  padding: "22px",
  boxSizing: "border-box",
};

const chartCardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "14px 16px",
  backgroundColor: "#FAF3E1",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
  minHeight: "320px",
};

const sectionTitleStyle = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#14213D",
  marginBottom: "12px",
  letterSpacing: "-0.02em",
};

const metricCardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px 14px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};

const STATUS_COLORS = {
  OPEN: "#14213D",
  PENDING: "#64748b",
  ACCEPTED: "#FCA311",
  IN_PROGRESS: "#FA8112",
  RESOLVED: "#2e7d32",
  REJECTED: "#d32f2f",
  UNKNOWN: "#94a3b8",
};

const PRIORITY_COLORS = {
  HIGH: "#d32f2f",
  MEDIUM: "#FCA311",
  LOW: "#2e7d32",
};

function normalizeStatus(s) {
  return String(s || "UNKNOWN")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_");
}

function normalizePriority(p) {
  return String(p || "UNKNOWN").toUpperCase().trim();
}

/** Last `days` calendar days, oldest first for charts. */
function bucketCreatedByDay(tickets, days = 14) {
  const now = new Date();
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: 0,
    });
  }
  const indexByKey = new Map(buckets.map((b, i) => [b.key, i]));
  for (const t of tickets) {
    if (!t?.createdAt) continue;
    const day = new Date(t.createdAt).toISOString().slice(0, 10);
    const idx = indexByKey.get(day);
    if (idx !== undefined) buckets[idx].count += 1;
  }
  return buckets;
}

function aggregateTickets(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const statusCounts = {};
  const priorityCounts = {};
  const categoryCounts = {};
  let acceptedOrActive = 0;
  let resolved = 0;

  for (const t of list) {
    const st = normalizeStatus(t.status);
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (st === "RESOLVED") resolved += 1;
    else if (st === "ACCEPTED" || st === "IN_PROGRESS") acceptedOrActive += 1;

    const pr = normalizePriority(t.priority);
    if (pr && pr !== "UNKNOWN") {
      priorityCounts[pr] = (priorityCounts[pr] || 0) + 1;
    }

    const cat = (t.category || "Uncategorized").trim() || "Uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const total = list.length;
  const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const statusPie = Object.entries(statusCounts)
    .filter(([, c]) => c > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
      color: STATUS_COLORS[name] || STATUS_COLORS.UNKNOWN,
    }));

  const priorityBar = ["HIGH", "MEDIUM", "LOW"].map((p) => ({
    name: p,
    count: priorityCounts[p] || 0,
    fill: PRIORITY_COLORS[p] || "#94a3b8",
  }));

  const categoryBar = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.length > 28 ? `${name.slice(0, 26)}…` : name, count }));

  const trend = bucketCreatedByDay(list, 14);

  const radialProgress = [
    {
      name: "Resolved",
      value: resolvedPct,
      fill: "#2e7d32",
    },
  ];

  return {
    total,
    resolved,
    acceptedOrActive,
    statusCounts,
    statusPie,
    priorityBar,
    categoryBar,
    trend,
    resolvedPct,
    radialProgress,
  };
}

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #F5E7C6",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
};

export default function TechnicianTicketDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => readCampusUser(), []);
  const isTechnician = String(user?.role || "").toUpperCase() === "TECHNICIAN";

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/signin", { replace: true, state: { from: "/technician/tickets" } });
      return;
    }
    if (!isTechnician) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getTechnicianAssignedTickets();
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not load assigned tickets.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, isTechnician]);

  const stats = useMemo(() => aggregateTickets(tickets), [tickets]);

  const composedData = useMemo(() => {
    let run = 0;
    return stats.trend.map((d) => {
      run += d.count;
      return { ...d, cumulative: run };
    });
  }, [stats.trend]);

  if (!isTechnician && user) {
    return null;
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "18px",
            paddingBottom: "14px",
            borderBottom: "1px solid #F5E7C6",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#FA8112", letterSpacing: "0.06em", marginBottom: "4px" }}>
              TECHNICIAN ANALYTICS
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#14213D" }}>
              Ticket dashboard
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#6b7280", fontSize: "13px", fontWeight: 600, maxWidth: "560px" }}>
              Visual breakdown of your assigned tickets: status, priority, category, trends, and resolution progress.
            </p>
          </div>
          <Link
            to="/technician"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid #F5E7C6",
              backgroundColor: "#FFFFFF",
              color: "#14213D",
              fontWeight: 800,
              fontSize: "13px",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(20, 33, 61, 0.06)",
            }}
          >
            ← Back to main dashboard
          </Link>
        </div>

        {error ? (
          <p style={{ color: "#c62828", fontWeight: 700, fontSize: "14px" }}>{error}</p>
        ) : null}

        {loading ? (
          <p style={{ color: "#6b7280", fontWeight: 600 }}>Loading your ticket analytics…</p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                marginBottom: "16px",
              }}
            >
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #14213D" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Assigned total</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 900, marginTop: "4px" }}>{stats.total}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #FCA311" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Accepted</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 900, marginTop: "4px" }}>
                  {stats.statusCounts.ACCEPTED || 0}
                </div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #FA8112" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>In progress</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 900, marginTop: "4px" }}>
                  {stats.statusCounts.IN_PROGRESS || 0}
                </div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #2e7d32" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Resolved</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 900, marginTop: "4px" }}>{stats.resolved}</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginBottom: "12px" }}>
              <div style={chartCardStyle}>
                <div style={sectionTitleStyle}>Status distribution (pie)</div>
                {stats.statusPie.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>No tickets to chart yet.</p>
                ) : (
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={stats.statusPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={96}
                          paddingAngle={2}
                        >
                          {stats.statusPie.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} stroke="#fff" strokeWidth={1} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div style={chartCardStyle}>
                <div style={sectionTitleStyle}>Resolution progress (radial)</div>
                <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Share of assigned tickets marked resolved.
                </p>
                <div style={{ position: "relative", width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="100%"
                      barSize={18}
                      data={stats.radialProgress}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#e8e3d8" }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Resolved"]} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "28px",
                      fontWeight: 900,
                      color: "#14213D",
                      pointerEvents: "none",
                    }}
                  >
                    {stats.resolvedPct}%
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "12px" }}>
              <div style={chartCardStyle}>
                <div style={sectionTitleStyle}>Priority (bar)</div>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.priorityBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {stats.priorityBar.map((entry, i) => (
                          <Cell key={`p-${i}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={chartCardStyle}>
                <div style={sectionTitleStyle}>Workload by category (horizontal bar)</div>
                {stats.categoryBar.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>No category data yet.</p>
                ) : (
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart layout="vertical" data={stats.categoryBar} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fontWeight: 600 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#14213D" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr", marginBottom: "12px" }}>
              <div style={chartCardStyle}>
                <div style={sectionTitleStyle}>New assignments (area plot — last 14 days)</div>
                <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Ticket creation dates for your assigned work (when the ticket was originally created).
                </p>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <AreaChart data={stats.trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="techAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FA8112" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#FA8112" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600 }} interval={2} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="count" stroke="#FA8112" strokeWidth={2} fill="url(#techAreaGrad)" name="New (day)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr", marginBottom: "4px" }}>
              <div style={chartCardStyle}>
                <div style={sectionTitleStyle}>Trend & cumulative line (composed chart)</div>
                <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Per-day ticket creations (bars) vs cumulative over the last 14 days (line).
                </p>
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={composedData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d8" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600 }} interval={2} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 700 }} />
                      <Bar yAxisId="left" dataKey="count" fill="#14213D" name="Per day" radius={[4, 4, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#2e7d32"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Cumulative"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "8px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px dashed #F5E7C6",
                backgroundColor: "#fff",
                color: "#6b7280",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              Charts use live data from your assigned tickets. Open the main technician dashboard to update progress or resolve tickets.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
