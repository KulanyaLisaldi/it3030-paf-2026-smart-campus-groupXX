import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTechnicianAssignedTickets } from "../api/technicianTickets";
import { getAuthToken } from "../api/http";
import { persistCampusUser, readCampusUser } from "../utils/campusUserStorage";
import { appFontFamily } from "../utils/appFont";

/** YYYY-MM-DD in the user's local timezone (aligned with weekday labels on the chart). */
function localCalendarDayKey(isoOrMs) {
  const d = new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function volumeDayKeyForAssignedTicket(ticket) {
  const raw = ticket?.technicianAssignedAt || ticket?.createdAt;
  if (!raw) return null;
  return localCalendarDayKey(raw);
}

const shellStyle = {
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #E8E4DC",
  boxShadow: "0 8px 24px rgba(20, 33, 61, 0.06)",
  padding: "clamp(18px, 2.5vw, 26px)",
  boxSizing: "border-box",
};

const chartCardStyle = {
  border: "1px solid #E8E4DC",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 2px 8px rgba(20, 33, 61, 0.04)",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "10px",
};

const metricCardStyle = {
  border: "1px solid #E8E4DC",
  borderRadius: "12px",
  padding: "12px 14px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 2px 8px rgba(20, 33, 61, 0.04)",
};

function technicianWelcomeName(user) {
  if (!user) return "Technician";
  const first = (user.firstName || "").trim();
  if (first) return first;
  const em = (user.email || "").trim();
  if (em && em.includes("@")) return em.split("@")[0];
  return "Technician";
}

function techSidebarNavRowStyle(active) {
  return {
    width: "100%",
    textAlign: "left",
    padding: "11px 16px",
    margin: "2px 8px",
    borderRadius: "10px",
    border: "none",
    background: active ? "rgba(250, 129, 18, 0.22)" : "transparent",
    color: active ? "#fb923c" : "#cbd5e1",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxSizing: "border-box",
    borderLeft: active ? "3px solid #FA8112" : "3px solid transparent",
  };
}

function techSidebarInitial(user) {
  if (!user) return "T";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "T";
}

const techSectionLabelStyle = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#94a3b8",
  padding: "0 16px",
  marginTop: "20px",
  marginBottom: "8px",
};

function TechnicianAppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 });
  const profileMenuTriggerRef = useRef(null);
  const profileMenuPopoverRef = useRef(null);
  const user = readCampusUser();
  const path = location.pathname;
  const isTicketDashboardActive =
    path === "/technician/tickets" || path.startsWith("/technician/tickets/");
  const isTechnicianHomeActive =
    path === "/technician" &&
    location.hash !== "#technician-personal-details" &&
    location.hash !== "#technician-assigned-tickets";
  const isMyAssignmentActive =
    path === "/technician" && location.hash === "#technician-assigned-tickets";
  const isPersonalDetailsActive = path === "/technician" && location.hash === "#technician-personal-details";

  const sidebarDisplayName = technicianWelcomeName(user);
  const sidebarEmail = (user?.email || "").trim() || "—";

  const openMyProfile = () => {
    setProfileMenuOpen(false);
    navigate("/technician#technician-personal-details");
  };

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (profileMenuTriggerRef.current?.contains(t)) return;
      if (profileMenuPopoverRef.current?.contains(t)) return;
      setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const update = () => {
      const el = profileMenuTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setProfileMenuPos({ top: r.bottom + 8, left: r.left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [profileMenuOpen, sidebarCollapsed]);

  useEffect(() => {
    if (sidebarCollapsed) setProfileMenuOpen(false);
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    persistCampusUser(null);
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/signin", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        backgroundColor: "#f1f5f9",
        fontFamily: appFontFamily,
        boxSizing: "border-box",
      }}
    >
      <aside
        style={{
          width: sidebarCollapsed ? "56px" : "272px",
          minWidth: sidebarCollapsed ? "56px" : "272px",
          flexShrink: 0,
          alignSelf: "stretch",
          minHeight: "100vh",
          transition: "width 0.2s ease, min-width 0.2s ease",
          background: "linear-gradient(180deg, #14213D 0%, #1a2d4d 100%)",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          borderRight: "1px solid rgba(148, 163, 184, 0.12)",
          overflow: "hidden",
        }}
      >
        {sidebarCollapsed ? (
          <div
            style={{
              padding: "14px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Open menu"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(148, 163, 184, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e2e8f0",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "22px 18px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: 0,
              }}
            >
              <button
                type="button"
                ref={profileMenuTriggerRef}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Account menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileMenuOpen((o) => !o);
                }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #FA8112, #F5E7C6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 18,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: profileMenuOpen ? "0 0 0 2px #FA8112" : "none",
                }}
              >
                {techSidebarInitial(user)}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#f8fafc" }}>Technician</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>Smart Campus</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarCollapsed(true);
              }}
              aria-label="Close menu"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(148, 163, 184, 0.12)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e2e8f0",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>≡</span>
            </button>
          </div>
        )}

        <nav style={{ flex: 1, padding: "4px 0" }} aria-label="Technician sections">
          {!sidebarCollapsed && <div style={techSectionLabelStyle}>MENU</div>}
          {!sidebarCollapsed && (
            <>
              <Link
                to="/technician/tickets"
                style={{ ...techSidebarNavRowStyle(isTicketDashboardActive), textDecoration: "none", display: "block" }}
              >
                Dashboard
              </Link>
              <Link
                to="/technician#technician-personal-details"
                style={{ ...techSidebarNavRowStyle(isPersonalDetailsActive), textDecoration: "none", display: "block" }}
              >
                Personal details
              </Link>
              <div style={techSectionLabelStyle}>Assign tickets</div>
              <Link
                to="/technician"
                style={{ ...techSidebarNavRowStyle(isTechnicianHomeActive), textDecoration: "none", display: "block" }}
              >
                Assign technician
              </Link>
              <Link
                to="/technician#technician-assigned-tickets"
                style={{ ...techSidebarNavRowStyle(isMyAssignmentActive), textDecoration: "none", display: "block" }}
              >
                My assignment
              </Link>
            </>
          )}
        </nav>

        {!sidebarCollapsed && (
          <div style={{ padding: "12px 14px 20px", borderTop: "1px solid rgba(148, 163, 184, 0.15)" }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(248, 113, 113, 0.35)",
                background: "rgba(127, 29, 29, 0.35)",
                color: "#fecaca",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {profileMenuOpen ? (
        <div
          ref={profileMenuPopoverRef}
          role="menu"
          style={{
            position: "fixed",
            top: profileMenuPos.top,
            left: profileMenuPos.left,
            width: "min(280px, calc(100vw - 24px))",
            zIndex: 10020,
            backgroundColor: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.14)",
            padding: 14,
            boxSizing: "border-box",
            fontFamily: appFontFamily,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {techSidebarInitial(user)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", wordBreak: "break-word" }}>{sidebarDisplayName}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{sidebarEmail}</div>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={openMyProfile}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              color: "#0f172a",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: appFontFamily,
            }}
          >
            My profile
          </button>
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "clamp(16px, 3vw, 28px) clamp(14px, 3vw, 24px)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function TechnicianTicketDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const campusUser = useMemo(() => readCampusUser(), []);
  const isTechnician = String(campusUser?.role || "").toUpperCase() === "TECHNICIAN";
  const welcomeName = technicianWelcomeName(campusUser);

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

  const dashboardStats = useMemo(() => {
    const data = Array.isArray(tickets) ? tickets : [];
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

    data.forEach((ticket) => {
      const status = (ticket.status || "").toUpperCase();
      const priority = (ticket.priority || "").toUpperCase();

      if (statusCounts[status] !== undefined) statusCounts[status] += 1;
      else statusCounts.OTHER += 1;

      if (priorityCounts[priority] !== undefined) priorityCounts[priority] += 1;
      else priorityCounts.OTHER += 1;
    });

    return { total, statusCounts, priorityCounts };
  }, [tickets]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    for (const t of Array.isArray(tickets) ? tickets : []) {
      const c = (t.category || "Uncategorized").trim() || "Uncategorized";
      map[c] = (map[c] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name: name.length > 34 ? `${name.slice(0, 32)}…` : name,
        count,
      }));
  }, [tickets]);

  const locationBreakdown = useMemo(() => {
    const map = {};
    for (const t of Array.isArray(tickets) ? tickets : []) {
      const loc = (t.resourceLocation || "").trim() || "Not specified";
      map[loc] = (map[loc] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({
        name: name.length > 30 ? `${name.slice(0, 28)}…` : name,
        count,
      }));
  }, [tickets]);

  const maxCategoryCount = Math.max(1, ...categoryBreakdown.map((x) => x.count));
  const maxLocationCount = Math.max(1, ...locationBreakdown.map((x) => x.count));

  const maxPriorityCount = Math.max(
    1,
    dashboardStats.priorityCounts.HIGH,
    dashboardStats.priorityCounts.MEDIUM,
    dashboardStats.priorityCounts.LOW,
    dashboardStats.priorityCounts.OTHER
  );

  const inProgressCount = dashboardStats.statusCounts.IN_PROGRESS;
  const acceptedCount = dashboardStats.statusCounts.ACCEPTED;

  /** Count per local calendar day — last 7 days; uses `technicianAssignedAt` when set, else `createdAt`. */
  const last7DaysBars = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(today.getDate() - i);
      const key = localCalendarDayKey(d.getTime());
      if (!key) continue;
      days.push({
        key,
        shortLabel: d.toLocaleDateString(undefined, { weekday: "short" }),
        count: 0,
      });
    }
    const map = Object.fromEntries(days.map((x) => [x.key, x]));
    for (const t of Array.isArray(tickets) ? tickets : []) {
      const key = volumeDayKeyForAssignedTicket(t);
      if (key && map[key]) map[key].count += 1;
    }
    return days;
  }, [tickets]);

  const maxDayBarCount = Math.max(1, ...last7DaysBars.map((d) => d.count));

  const statusPieGradient = useMemo(() => {
    if (dashboardStats.total === 0) {
      return "conic-gradient(#E5E5E5 0 100%)";
    }
    const total = dashboardStats.total || 1;
    const parts = [
      { color: "#14213D", count: dashboardStats.statusCounts.OPEN },
      { color: "#FCA311", count: dashboardStats.statusCounts.ACCEPTED },
      { color: "#FA8112", count: dashboardStats.statusCounts.IN_PROGRESS },
      { color: "#2e7d32", count: dashboardStats.statusCounts.RESOLVED },
      { color: "#d32f2f", count: dashboardStats.statusCounts.REJECTED },
    ];
    let current = 0;
    const stops = parts
      .filter((p) => p.count > 0)
      .map((p) => {
        const pct = (p.count / total) * 100;
        const start = current;
        current += pct;
        return `${p.color} ${start}% ${current}%`;
      })
      .join(", ");
    return stops ? `conic-gradient(${stops})` : "conic-gradient(#E5E5E5 0 100%)";
  }, [dashboardStats]);

  if (!isTechnician && campusUser) {
    return null;
  }

  return (
    <TechnicianAppShell>
      <div style={{ ...shellStyle, width: "100%", maxWidth: "1180px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1px solid #E8E4DC",
          }}
        >
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 900, color: "#14213D" }}>
              Ticket dashboard
            </h1>
          </div>
        </div>

        {error ? (
          <p style={{ color: "#c62828", fontWeight: 700, fontSize: "14px" }}>{error}</p>
        ) : null}

        {loading ? (
          <p style={{ color: "#6b7280", fontWeight: 600 }}>Loading your ticket analytics…</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              width: "100%",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E8E4DC",
                borderLeft: "4px solid #FA8112",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(20, 33, 61, 0.04)",
              }}
            >
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                <span style={{ fontSize: "clamp(17px, 2.1vw, 22px)", fontWeight: 800, color: "#14213D" }}>
                  Welcome back, {welcomeName}.
                </span>
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                width: "100%",
              }}
            >
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #14213D" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Assigned total</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.total}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #FA8112" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>In progress</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{inProgressCount}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #FCA311" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Accepted</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{acceptedCount}</div>
              </div>
              <div style={{ ...metricCardStyle, borderLeft: "6px solid #2e7d32" }}>
                <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Resolved</div>
                <div style={{ color: "#14213D", fontSize: "26px", fontWeight: 800 }}>{dashboardStats.statusCounts.RESOLVED}</div>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                alignItems: "stretch",
              }}
            >
              <div style={{ ...chartCardStyle, minWidth: 0 }}>
                <div style={sectionTitleStyle}>Ticket volume by day</div>
                <p style={{ margin: "0 0 14px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  How many tickets landed in your queue each day (last 7 days), using assignment time when available,
                  otherwise report time.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: "8px",
                    minHeight: "200px",
                    padding: "8px 4px 4px",
                    borderBottom: "2px solid #E8E4DC",
                  }}
                >
                  {last7DaysBars.map((day, index) => (
                    <div
                      key={day.key}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "6px",
                        minWidth: 0,
                      }}
                    >
                      <div style={{ color: "#14213D", fontSize: "13px", fontWeight: 800 }}>{day.count}</div>
                      <div
                        title={`${day.count} ticket(s)`}
                        style={{
                          width: "100%",
                          maxWidth: "36px",
                          height: `${Math.max(10, (day.count / maxDayBarCount) * 140)}px`,
                          borderRadius: "8px 8px 0 0",
                          backgroundColor: index === last7DaysBars.length - 1 ? "#FA8112" : "#14213D",
                          transition: "height 0.2s ease",
                        }}
                      />
                      <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
                        {day.shortLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...chartCardStyle, minWidth: 0 }}>
                <div style={sectionTitleStyle}>Your tickets by status</div>
                <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Share of each status across tickets assigned to you.
                </p>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "220px" }}>
                  <div
                    style={{
                      width: "220px",
                      height: "220px",
                      borderRadius: "50%",
                      background: statusPieGradient,
                      border: "1px solid #E8E4DC",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        width: "96px",
                        height: "96px",
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        border: "1px solid #E8E4DC",
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

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                width: "100%",
                alignItems: "stretch",
              }}
            >
              <div style={chartCardStyle}>
                <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>Priority breakdown</div>
                <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  How urgent your assignments are.
                </p>
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
                    <div style={{ height: "12px", borderRadius: "999px", border: "1px solid #E8E4DC", backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(Number(count) / maxPriorityCount) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={chartCardStyle}>
                <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>By issue category</div>
                <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Types of work assigned to you (electrical, maintenance, etc.).
                </p>
                {categoryBreakdown.length === 0 ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: 600 }}>No category data.</p>
                ) : (
                  categoryBreakdown.map((row) => (
                    <div key={row.name} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700, gap: "8px" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
                        <span style={{ flexShrink: 0 }}>{row.count}</span>
                      </div>
                      <div style={{ height: "10px", borderRadius: "999px", border: "1px solid #E8E4DC", backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(row.count / maxCategoryCount) * 100}%`,
                            backgroundColor: "#14213D",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={chartCardStyle}>
                <div style={{ ...sectionTitleStyle, marginBottom: "10px" }}>By location / resource</div>
                <p style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
                  Where tickets are reported on campus (up to 12 locations).
                </p>
                {locationBreakdown.length === 0 ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: 600 }}>No location data.</p>
                ) : (
                  locationBreakdown.map((row) => (
                    <div key={row.name} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#374151", fontSize: "13px", fontWeight: 700, gap: "8px" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
                        <span style={{ flexShrink: 0 }}>{row.count}</span>
                      </div>
                      <div style={{ height: "10px", borderRadius: "999px", border: "1px solid #E8E4DC", backgroundColor: "#F3F4F6", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(row.count / maxLocationCount) * 100}%`,
                            backgroundColor: "#FA8112",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TechnicianAppShell>
  );
}
