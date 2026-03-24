import React, { useEffect, useMemo, useState } from "react";
import { getAdminTicketList } from "../api/adminticket";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(180deg, #FAF3E1 0%, #FFFFFF 70%)",
  padding: "28px 16px",
  display: "flex",
  justifyContent: "center",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1180px",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.08)",
  padding: "22px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #F5E7C6",
  backgroundColor: "#FAF3E1",
};

const titleStyle = {
  margin: 0,
  fontSize: "26px",
  fontWeight: 800,
  letterSpacing: "-0.3px",
  color: "#222222",
};

const subtitleStyle = {
  margin: "4px 0 0 0",
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 500,
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const logoutButtonStyle = {
  padding: "8px 20px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#222222",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "opacity 0.2s ease",
};

const chipBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "14px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  minHeight: "40px",
};

const cardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "18px",
  backgroundColor: "#FFFFFF",
  marginBottom: "14px",
  boxShadow: "0 8px 18px rgba(20, 33, 61, 0.06)",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "8px",
};

const commentBoxStyle = {
  marginTop: "10px",
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#FAF3E1",
};

const selectStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  minWidth: "210px",
};

const metricCardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};

const chartCardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "14px",
  backgroundColor: "#FAF3E1",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};

function toProgressPercent(status) {
  if (status === "OPEN") return 20;
  if (status === "ACCEPTED") return 40;
  if (status === "IN_PROGRESS") return 70;
  if (status === "RESOLVED") return 100;
  if (status === "REJECTED") return 100;
  return 10;
}

function formatDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function getProgressInfo(status, commentsCount) {
  const normalizedStatus = (status || "").toUpperCase();
  if (normalizedStatus === "RESOLVED") {
    return { percent: 100, label: "Resolved", color: "#2e7d32" };
  }
  if (normalizedStatus === "REJECTED") {
    return { percent: 100, label: "Rejected", color: "#d32f2f" };
  }
  if (normalizedStatus === "IN_PROGRESS") {
    return { percent: 70, label: "Accepted and in progress", color: "#FCA311" };
  }
  if (normalizedStatus === "ACCEPTED") {
    return { percent: 40, label: "Accepted", color: "#FCA311" };
  }
  if (normalizedStatus === "OPEN") {
    if (commentsCount > 0) {
      return { percent: 30, label: "Under review", color: "#14213D" };
    }
    return { percent: 20, label: "Submitted, waiting for admin action", color: "#14213D" };
  }

  const fallbackPercent = toProgressPercent(normalizedStatus);
  return { percent: fallbackPercent, label: normalizedStatus || "Pending", color: "#14213D" };
}

export default function AdminTicketDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTicketIds, setOpenTicketIds] = useState({});
  const [activeView, setActiveView] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminTicketList();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "tickets") {
      setActiveView("tickets");
    } else {
      setActiveView("dashboard");
    }
  }, []);

  const toggleOpen = (ticketId) => {
    setOpenTicketIds((prev) => ({ ...prev, [ticketId]: !prev[ticketId] }));
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    const params = new URLSearchParams(window.location.search);
    params.set("view", view);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const navigateFromSidebar = (item) => {
    setActiveMenuItem(item);
    if (item === "Tickets") {
      handleViewChange("tickets");
      return;
    }

    // Keep Dashboard view for dashboard sections.
    handleViewChange("dashboard");

    // Smooth jump to chart/report areas on this page.
    setTimeout(() => {
      if (item === "Charts") {
        document.getElementById("admin-dashboard-charts")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (item === "Reports") {
        document.getElementById("admin-dashboard-reports")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        document.getElementById("admin-dashboard-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem("smartCampusUser");
    window.location.href = "/";
  };

  const handleLogoutHover = (e, isHover) => {
    e.currentTarget.style.opacity = isHover ? "0.9" : "1";
  };

  const filteredAndSortedTickets = useMemo(() => {
    const list = Array.isArray(tickets) ? [...tickets] : [];

    const filtered = list.filter((item) => {
      const ticket = item?.ticket || {};
      const status = (ticket.status || "").toUpperCase();
      const priority = (ticket.priority || "").toUpperCase();

      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && priority !== priorityFilter) return false;
      return true;
    });

    const priorityRank = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    filtered.sort((a, b) => {
      const ticketA = a?.ticket || {};
      const ticketB = b?.ticket || {};

      if (sortBy === "DATE_DESC" || sortBy === "DATE_ASC") {
        const dateA = new Date(ticketA.createdAt || 0).getTime();
        const dateB = new Date(ticketB.createdAt || 0).getTime();
        return sortBy === "DATE_DESC" ? dateB - dateA : dateA - dateB;
      }

      if (sortBy === "PRIORITY_DESC" || sortBy === "PRIORITY_ASC") {
        const rankA = priorityRank[(ticketA.priority || "").toUpperCase()] || 0;
        const rankB = priorityRank[(ticketB.priority || "").toUpperCase()] || 0;
        return sortBy === "PRIORITY_DESC" ? rankB - rankA : rankA - rankB;
      }

      if (sortBy === "STATUS_ASC" || sortBy === "STATUS_DESC") {
        const statusA = (ticketA.status || "").toUpperCase();
        const statusB = (ticketB.status || "").toUpperCase();
        return sortBy === "STATUS_ASC"
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      }

      return 0;
    });

    return filtered;
  }, [tickets, statusFilter, priorityFilter, sortBy]);

  const dashboardStats = useMemo(() => {
    const data = filteredAndSortedTickets;
    const total = data.length;
    const statusCounts = {
      OPEN: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      REJECTED: 0,
      OTHER: 0,
    };
    const priorityCounts = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      OTHER: 0,
    };
    let totalComments = 0;

    data.forEach((item) => {
      const ticket = item?.ticket || {};
      const comments = Array.isArray(item?.comments) ? item.comments : [];
      totalComments += comments.length;

      const status = (ticket.status || "").toUpperCase();
      const priority = (ticket.priority || "").toUpperCase();

      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      else statusCounts.OTHER += 1;

      if (priorityCounts[priority] !== undefined) priorityCounts[priority] += 1;
      else priorityCounts.OTHER += 1;
    });

    const avgComments = total === 0 ? 0 : (totalComments / total).toFixed(1);
    return { total, statusCounts, priorityCounts, totalComments, avgComments };
  }, [filteredAndSortedTickets]);

  const maxStatusCount = Math.max(
    1,
    dashboardStats.statusCounts.OPEN,
    dashboardStats.statusCounts.ACCEPTED,
    dashboardStats.statusCounts.IN_PROGRESS,
    dashboardStats.statusCounts.RESOLVED,
    dashboardStats.statusCounts.REJECTED,
    dashboardStats.statusCounts.OTHER
  );

  const maxPriorityCount = Math.max(
    1,
    dashboardStats.priorityCounts.HIGH,
    dashboardStats.priorityCounts.MEDIUM,
    dashboardStats.priorityCounts.LOW,
    dashboardStats.priorityCounts.OTHER
  );

  const openInProgressCount = dashboardStats.statusCounts.OPEN + dashboardStats.statusCounts.IN_PROGRESS;
  const resolvedRejectedCount = dashboardStats.statusCounts.RESOLVED + dashboardStats.statusCounts.REJECTED;
  const resolutionRate = dashboardStats.total === 0 ? 0 : Math.round((dashboardStats.statusCounts.RESOLVED / dashboardStats.total) * 100);
  const highPriorityShare = dashboardStats.total === 0 ? 0 : Math.round((dashboardStats.priorityCounts.HIGH / dashboardStats.total) * 100);

  const statusPieSegments = useMemo(() => {
    const total = dashboardStats.total || 1;
    const parts = [
      { label: "Open", count: dashboardStats.statusCounts.OPEN, color: "#14213D" },
      { label: "Accepted", count: dashboardStats.statusCounts.ACCEPTED, color: "#FCA311" },
      { label: "In Progress", count: dashboardStats.statusCounts.IN_PROGRESS, color: "#FA8112" },
      { label: "Resolved", count: dashboardStats.statusCounts.RESOLVED, color: "#2e7d32" },
      { label: "Rejected", count: dashboardStats.statusCounts.REJECTED, color: "#d32f2f" },
    ];

    let current = 0;
    return parts.map((part) => {
      const percent = (part.count / total) * 100;
      const start = current;
      current += percent;
      return { ...part, percent, start, end: current };
    });
  }, [dashboardStats]);

  const statusPieGradient = useMemo(() => {
    if (dashboardStats.total === 0) {
      return "conic-gradient(#E5E5E5 0 100%)";
    }
    const stops = statusPieSegments
      .filter((s) => s.percent > 0)
      .map((s) => `${s.color} ${s.start}% ${s.end}%`)
      .join(", ");
    return `conic-gradient(${stops})`;
  }, [statusPieSegments, dashboardStats.total]);

  const growthData = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: 0,
      });
    }

    const map = Object.fromEntries(days.map((d) => [d.key, d]));
    filteredAndSortedTickets.forEach((item) => {
      const createdAt = item?.ticket?.createdAt;
      if (!createdAt) return;
      const key = new Date(createdAt).toISOString().slice(0, 10);
      if (map[key]) map[key].count += 1;
    });

    return days;
  }, [filteredAndSortedTickets]);

  const maxGrowthCount = Math.max(1, ...growthData.map((d) => d.count));

  return (
    <div style={pageStyle}>
      <section style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>
              {activeView === "dashboard" ? "Admin Ticket Main Dashboard" : "Admin Ticket Operations"}
            </h1>
            <p style={subtitleStyle}>
              {activeView === "dashboard"
                ? "Ticket monitoring and support operations"
                : "Ticket list management with filtering and sorting"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ ...chipBaseStyle, backgroundColor: "#14213D", color: "#FFFFFF" }}>
              Total Tickets: {filteredAndSortedTickets.length}
            </span>
          </div>
        </div>

        {activeView === "dashboard" && (
          <div
            style={{
              marginBottom: "14px",
              display: "grid",
              gridTemplateColumns: "250px minmax(0, 1fr)",
              gap: "12px",
              alignItems: "stretch",
            }}
          >
            <aside
              id="admin-dashboard-top"
              style={{
                border: "1px solid #F5E7C6",
                borderRadius: "12px",
                backgroundColor: "#FAF3E1",
                padding: "12px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ color: "#14213D", fontSize: "24px", fontWeight: 800, marginBottom: "10px" }}>Admin Desk</div>
              <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }}>
                Maintenance & Incident Analytics
              </div>

              <div style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
                {["Dashboard", "Tickets", "Charts", "Reports"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => navigateFromSidebar(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid #F5E7C6",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      backgroundColor: activeMenuItem === item ? "#14213D" : "#FFFFFF",
                      color: activeMenuItem === item ? "#FFFFFF" : "#374151",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ ...metricCardStyle, backgroundColor: "#14213D", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.9 }}>Open Tickets</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.statusCounts.OPEN}</div>
                </div>
                <div style={{ ...metricCardStyle, backgroundColor: "#FA8112", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.95 }}>High Priority</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.priorityCounts.HIGH}</div>
                </div>
                <div style={{ ...metricCardStyle, backgroundColor: "#FCA311", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.95 }}>Comments</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.totalComments}</div>
                </div>
                <div style={{ ...metricCardStyle, backgroundColor: "#2e7d32", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.95 }}>Resolved</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.statusCounts.RESOLVED}</div>
                </div>
              </div>

              <div style={{ marginTop: "12px", border: "1px solid #F5E7C6", borderRadius: "10px", padding: "12px", backgroundColor: "#FFFFFF" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Performance</div>
                <div style={{ marginTop: "8px", color: "#374151", fontSize: "13px", fontWeight: 700 }}>
                  Resolution Rate: <span style={{ color: "#2e7d32" }}>{resolutionRate}%</span>
                </div>
                <div style={{ marginTop: "4px", color: "#374151", fontSize: "13px", fontWeight: 700 }}>
                  High Priority Share: <span style={{ color: "#d32f2f" }}>{highPriorityShare}%</span>
                </div>
                <div style={{ marginTop: "4px", color: "#374151", fontSize: "13px", fontWeight: 700 }}>
                  Closed Tickets: <span style={{ color: "#14213D" }}>{resolvedRejectedCount}</span>
                </div>
              </div>

              <button
                type="button"
                style={{ ...logoutButtonStyle, marginTop: "auto", width: "100%" }}
                onMouseEnter={(e) => handleLogoutHover(e, true)}
                onMouseLeave={(e) => handleLogoutHover(e, false)}
                onClick={handleLogout}
              >
                Logout
              </button>
            </aside>

            <div
              style={{
                border: "1px solid #F5E7C6",
                borderRadius: "12px",
                backgroundColor: "#FAF3E1",
                padding: "14px",
                boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
              }}
            >
              <div
                style={{
                  border: "1px solid #F5E7C6",
                  borderRadius: "10px",
                  padding: "12px",
                  backgroundColor: "#FFFFFF",
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ color: "#222222", fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>Welcome back, Admin</div>
                  <div style={{ color: "#6b7280", fontSize: "13px", fontWeight: 600, marginTop: "4px" }}>
                    Ticket analytics dashboard with live operational metrics
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginBottom: "10px" }}>
                <div style={{ ...metricCardStyle, borderLeft: "6px solid #14213D" }}>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Total Tickets</div>
                  <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.total}</div>
                </div>
                <div style={{ ...metricCardStyle, borderLeft: "6px solid #FA8112" }}>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Open / In Progress</div>
                  <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{openInProgressCount}</div>
                </div>
                <div style={{ ...metricCardStyle, borderLeft: "6px solid #2e7d32" }}>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Resolved</div>
                  <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.statusCounts.RESOLVED}</div>
                </div>
                <div style={{ ...metricCardStyle, borderLeft: "6px solid #d32f2f" }}>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Rejected</div>
                  <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.statusCounts.REJECTED}</div>
                </div>
              </div>

              <div id="admin-dashboard-charts" style={{ display: "grid", gap: "10px", gridTemplateColumns: "1.1fr 1fr", marginBottom: "10px" }}>
                <div style={chartCardStyle}>
                  <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Status Distribution Summary</div>
                  <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
                    {statusPieSegments.map((seg) => (
                      <div key={seg.label} style={{ border: "1px solid #F5E7C6", borderRadius: "10px", padding: "10px", backgroundColor: "#FFFFFF" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "999px", backgroundColor: seg.color }} />
                          {seg.label}
                        </div>
                        <div style={{ marginTop: "4px", color: "#222222", fontSize: "24px", fontWeight: 800 }}>{seg.percent.toFixed(0)}%</div>
                        <div style={{ color: "#374151", fontSize: "12px", fontWeight: 600 }}>{seg.count} tickets</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={chartCardStyle}>
                  <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Status Pie Chart</div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "220px" }}>
                    <div
                      style={{
                        width: "220px",
                        height: "220px",
                        borderRadius: "50%",
                        background: statusPieGradient,
                        border: "1px solid #F5E7C6",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          width: "96px",
                          height: "96px",
                          borderRadius: "50%",
                          backgroundColor: "#FAF3E1",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          border: "1px solid #F5E7C6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                        }}
                      >
                        <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700 }}>TOTAL</div>
                        <div style={{ color: "#14213D", fontSize: "24px", fontWeight: 800, lineHeight: 1 }}>{dashboardStats.total}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="admin-dashboard-reports" style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                <div style={chartCardStyle}>
                  <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Status Bar Chart</div>
                  {[
                    ["OPEN", dashboardStats.statusCounts.OPEN, "#14213D"],
                    ["ACCEPTED", dashboardStats.statusCounts.ACCEPTED, "#FCA311"],
                    ["IN_PROGRESS", dashboardStats.statusCounts.IN_PROGRESS, "#FA8112"],
                    ["RESOLVED", dashboardStats.statusCounts.RESOLVED, "#2e7d32"],
                    ["REJECTED", dashboardStats.statusCounts.REJECTED, "#d32f2f"],
                  ].map(([label, count, color]) => (
                    <div key={label} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700 }}>
                        <span>{label}</span>
                        <span>{count}</span>
                      </div>
                      <div style={{ height: "10px", borderRadius: "999px", border: "1px solid #F5E7C6", backgroundColor: "#FAF3E1", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(Number(count) / maxStatusCount) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={chartCardStyle}>
                  <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Priority Bar Chart</div>
                  {[
                    ["HIGH", dashboardStats.priorityCounts.HIGH, "#d32f2f"],
                    ["MEDIUM", dashboardStats.priorityCounts.MEDIUM, "#FCA311"],
                    ["LOW", dashboardStats.priorityCounts.LOW, "#2e7d32"],
                  ].map(([label, count, color]) => (
                    <div key={label} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700 }}>
                        <span>{label}</span>
                        <span>{count}</span>
                      </div>
                      <div style={{ height: "12px", borderRadius: "999px", border: "1px solid #F5E7C6", backgroundColor: "#FAF3E1", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(Number(count) / maxPriorityCount) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={chartCardStyle}>
                  <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Growth Chart (Last 7 Days)</div>
                  <div style={{ display: "flex", alignItems: "end", gap: "10px", height: "180px", padding: "8px 4px 0 4px", borderBottom: "1px solid #F5E7C6" }}>
                    {growthData.map((day, index) => (
                      <div key={day.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", position: "relative" }}>
                        <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700 }}>{day.count}</div>
                        <div
                          style={{
                            width: "100%",
                            maxWidth: "24px",
                            height: `${Math.max(8, (day.count / maxGrowthCount) * 120)}px`,
                            borderRadius: "8px 8px 0 0",
                            backgroundColor: index === growthData.length - 1 ? "#FA8112" : "#14213D",
                          }}
                        />
                        <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600 }}>{day.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={chartCardStyle}>
                  <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Workload Mix</div>
                  <div style={{ border: "1px solid #F5E7C6", borderRadius: "10px", overflow: "hidden", height: "24px", display: "flex" }}>
                    <div style={{ width: `${dashboardStats.total ? (dashboardStats.statusCounts.OPEN / dashboardStats.total) * 100 : 0}%`, backgroundColor: "#14213D" }} />
                    <div style={{ width: `${dashboardStats.total ? (dashboardStats.statusCounts.IN_PROGRESS / dashboardStats.total) * 100 : 0}%`, backgroundColor: "#FA8112" }} />
                    <div style={{ width: `${dashboardStats.total ? (dashboardStats.statusCounts.RESOLVED / dashboardStats.total) * 100 : 0}%`, backgroundColor: "#2e7d32" }} />
                    <div style={{ width: `${dashboardStats.total ? (dashboardStats.statusCounts.REJECTED / dashboardStats.total) * 100 : 0}%`, backgroundColor: "#d32f2f" }} />
                  </div>
                  <div style={{ marginTop: "10px", display: "grid", gap: "6px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                    <div style={{ color: "#374151", fontSize: "12px", fontWeight: 700 }}>Open: {dashboardStats.statusCounts.OPEN}</div>
                    <div style={{ color: "#374151", fontSize: "12px", fontWeight: 700 }}>In Progress: {dashboardStats.statusCounts.IN_PROGRESS}</div>
                    <div style={{ color: "#374151", fontSize: "12px", fontWeight: 700 }}>Resolved: {dashboardStats.statusCounts.RESOLVED}</div>
                    <div style={{ color: "#374151", fontSize: "12px", fontWeight: 700 }}>Rejected: {dashboardStats.statusCounts.REJECTED}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "tickets" && (
          <div
            style={{
              marginBottom: "14px",
              display: "grid",
              gridTemplateColumns: "250px minmax(0, 1fr)",
              gap: "12px",
              alignItems: "stretch",
            }}
          >
            <aside
              style={{
                border: "1px solid #F5E7C6",
                borderRadius: "12px",
                backgroundColor: "#FAF3E1",
                padding: "12px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ color: "#14213D", fontSize: "24px", fontWeight: 800, marginBottom: "10px" }}>Admin Desk</div>
              <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }}>
                Maintenance & Incident Analytics
              </div>

              <div style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
                {["Dashboard", "Tickets", "Charts", "Reports"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => navigateFromSidebar(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid #F5E7C6",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      backgroundColor: activeMenuItem === item ? "#14213D" : "#FFFFFF",
                      color: activeMenuItem === item ? "#FFFFFF" : "#374151",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ ...metricCardStyle, backgroundColor: "#14213D", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.9 }}>Open Tickets</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.statusCounts.OPEN}</div>
                </div>
                <div style={{ ...metricCardStyle, backgroundColor: "#FA8112", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.95 }}>High Priority</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.priorityCounts.HIGH}</div>
                </div>
                <div style={{ ...metricCardStyle, backgroundColor: "#FCA311", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.95 }}>Comments</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.totalComments}</div>
                </div>
                <div style={{ ...metricCardStyle, backgroundColor: "#2e7d32", color: "#FFFFFF", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", opacity: 0.95 }}>Resolved</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.05 }}>{dashboardStats.statusCounts.RESOLVED}</div>
                </div>
              </div>

              <button
                type="button"
                style={{ ...logoutButtonStyle, marginTop: "auto", width: "100%" }}
                onMouseEnter={(e) => handleLogoutHover(e, true)}
                onMouseLeave={(e) => handleLogoutHover(e, false)}
                onClick={handleLogout}
              >
                Logout
              </button>
            </aside>

            <div>
              <div
                style={{
                  marginBottom: "12px",
                  padding: "14px",
                  border: "1px solid #F5E7C6",
                  borderRadius: "12px",
                  backgroundColor: "#FAF3E1",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
                }}
              >
                <select style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">Filter by Status: All</option>
                  <option value="OPEN">Open</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <select style={selectStyle} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="ALL">Filter by Priority: All</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select style={selectStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="DATE_DESC">Sort by Date: Newest First</option>
                  <option value="DATE_ASC">Sort by Date: Oldest First</option>
                  <option value="PRIORITY_DESC">Sort by Priority: High to Low</option>
                  <option value="PRIORITY_ASC">Sort by Priority: Low to High</option>
                  <option value="STATUS_ASC">Sort by Status: A to Z</option>
                  <option value="STATUS_DESC">Sort by Status: Z to A</option>
                </select>
              </div>

              {loading && <p>Loading all tickets...</p>}
              {!loading && error && <p style={{ color: "#d32f2f" }}>{error}</p>}
              {!loading && !error && filteredAndSortedTickets.length === 0 && <p>No tickets found.</p>}

              {!loading &&
                !error &&
                filteredAndSortedTickets.map((item) => {
            const ticket = item.ticket || {};
            const comments = item.comments || [];
            const progress = getProgressInfo(ticket.status, comments.length);

            return (
              <article key={ticket.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: "260px" }}>
                    <div style={{ fontWeight: 800, color: "#14213D", marginBottom: "6px" }}>
                      {ticket.issueTitle || "Untitled Ticket"}
                    </div>
                    <div style={{ color: "#374151", fontSize: "14px", fontWeight: 600 }}>
                      Location: <span style={{ fontWeight: 400 }}>{ticket.resourceLocation}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ ...chipBaseStyle, backgroundColor: "#14213D", color: "#FFFFFF" }}>
                      Status: {ticket.status}
                    </span>
                    <span
                      style={{
                        ...chipBaseStyle,
                        backgroundColor:
                          ticket.priority === "High"
                            ? "#d32f2f"
                            : ticket.priority === "Medium"
                              ? "#FCA311"
                              : "#2e7d32",
                        color: "#FFFFFF",
                      }}
                    >
                      Priority: {ticket.priority}
                    </span>
                    <span style={{ ...chipBaseStyle, backgroundColor: "#E5E5E5", color: "#14213D" }}>
                      Comments: {comments.length}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ color: "#374151", fontWeight: 600 }}>Progress: {progress.percent}%</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>{formatDate(ticket.createdAt)}</div>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    {progress.label}
                  </div>
                  <div style={{ height: "10px", backgroundColor: "#FAF3E1", border: "1px solid #F5E7C6", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${progress.percent}%`,
                        height: "100%",
                        backgroundColor: progress.color,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "grid",
                    gap: "8px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    alignItems: "start",
                  }}
                >
                  <div style={{ border: "1px solid #F5E7C6", borderRadius: "10px", padding: "12px", backgroundColor: "#FAF3E1" }}>
                    <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>Reported By</div>
                    <div style={{ color: "#222222", fontSize: "14px", fontWeight: 700 }}>{ticket.fullName || "N/A"}</div>
                    <div style={{ color: "#374151", fontSize: "13px", marginTop: "4px" }}>{ticket.email || "N/A"}</div>
                    <div style={{ color: "#374151", fontSize: "13px", marginTop: "2px" }}>{ticket.phoneNumber || "N/A"}</div>
                  </div>
                </div>

                <div style={{ marginTop: "10px", border: "1px solid #F5E7C6", borderRadius: "10px", padding: "12px", backgroundColor: "#FAF3E1" }}>
                  <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>Description</div>
                  <div style={{ color: "#374151", fontSize: "14px", fontWeight: 400, lineHeight: 1.45, marginTop: "4px" }}>
                    {ticket.description || "No description provided."}
                  </div>
                </div>

                <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" style={buttonStyle} onClick={() => toggleOpen(ticket.id)}>
                    {openTicketIds[ticket.id] ? "Hide Comments" : "Show Comments"}
                  </button>
                </div>

                {openTicketIds[ticket.id] && (
                  <div style={commentBoxStyle}>
                    <div style={sectionTitleStyle}>Comments</div>
                    {comments.length === 0 ? (
                      <p style={{ margin: 0, color: "#6b7280" }}>No comments yet.</p>
                    ) : (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              border: "1px solid #F5E7C6",
                              borderRadius: "12px",
                              padding: "12px",
                              backgroundColor: "#FFFFFF",
                            }}
                          >
                            <div style={{ fontWeight: 800, color: "#14213D" }}>{c.createdBy || "Unknown"}</div>
                            <div style={{ marginTop: "6px", color: "#374151", fontSize: "14px", fontWeight: 400, lineHeight: 1.45 }}>
                              {c.content}
                            </div>
                            <div style={{ marginTop: "8px", color: "#6b7280", fontSize: "12px" }}>{formatDate(c.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

