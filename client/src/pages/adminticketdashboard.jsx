import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acceptAdminTicket, getAdminTicketList } from "../api/adminticket";
import { listTechnicians } from "../api/adminTechnicians";
import { technicianCategoryLabel } from "../constants/technicianCategories";

const ADMIN_SIDEBAR_ITEMS = ["Dashboard", "Tickets", "Charts", "Reports"];

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

/** Compact chips for dense table cells so long statuses (e.g. IN_PROGRESS) stay inside the column */
const tableChipStyle = {
  ...chipBaseStyle,
  padding: "6px 10px",
  fontSize: "11px",
  minHeight: "28px",
  boxSizing: "border-box",
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

const EXTRA_BAR_WIDTH_EXPANDED = 260;
const EXTRA_BAR_WIDTH_COLLAPSED = 56;

const extraBarToggleHamburgerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  width: "18px",
  alignItems: "stretch",
};

const extraBarHamburgerLineStyle = {
  height: "2px",
  borderRadius: "1px",
  backgroundColor: "#ffffff",
};

const extraBarStyle = {
  borderRadius: "12px",
  background: "linear-gradient(180deg, #14213D 0%, #1a2d4d 100%)",
  color: "#e2e8f0",
  display: "flex",
  flexDirection: "column",
  minHeight: "calc(100vh - 16px)",
  boxSizing: "border-box",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  padding: "14px 10px 10px",
  position: "fixed",
  left: "8px",
  top: "8px",
  zIndex: 120,
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.18)",
  transition: "width 0.22s ease, padding 0.22s ease, border-radius 0.22s ease, background 0.22s ease",
};

const extraBarLabelStyle = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "#94a3b8",
  marginTop: "12px",
  marginBottom: "8px",
  padding: "0 10px",
};

function extraBarItemStyle(active) {
  return {
    width: "100%",
    textAlign: "left",
    padding: "11px 12px",
    margin: "2px 0",
    borderRadius: "10px",
    border: active ? "1px solid #FA8112" : "1px solid transparent",
    background: active ? "rgba(250, 129, 18, 0.2)" : "transparent",
    color: active ? "#fb923c" : "#cbd5e1",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

const hasOnlyAllowedTextChars = (value) => /^[a-zA-Z0-9\s]+$/.test(value);
const hasTooManyRepeatedChars = (value) => /(.)\1{3,}/.test(value);

const DECISIONS_STORAGE_KEY = "adminTicketDecisions";
const NOTIFICATIONS_STORAGE_KEY = "smartCampusNotifications";

const getStoredDecisions = () => {
  try {
    const raw = localStorage.getItem(DECISIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const storeDecision = (ticketId, status, rejectionReason = "", assignedTechnicianName = "") => {
  const current = getStoredDecisions();
  const entry = {
    status,
    rejectionReason: rejectionReason || "",
    updatedAt: new Date().toISOString(),
  };
  if (status === "ACCEPTED" && assignedTechnicianName) {
    entry.assignedTechnicianName = assignedTechnicianName;
  }
  current[ticketId] = entry;
  localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(current));
};

const pushUserNotification = (ticket, status, rejectionReason = "") => {
  try {
    const current = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || "[]");
    const list = Array.isArray(current) ? current : [];
    const isRejected = (status || "").toUpperCase() === "REJECTED";
    const message = isRejected
      ? `Your ticket "${ticket?.issueTitle || "Untitled Ticket"}" was rejected. Reason: ${rejectionReason}`
      : `Your ticket "${ticket?.issueTitle || "Untitled Ticket"}" was accepted by admin.`;

    list.unshift({
      id: `${ticket?.id || "ticket"}-${Date.now()}`,
      ticketId: ticket?.id || "",
      createdBy: ticket?.createdBy || ticket?.email || "",
      status: (status || "").toUpperCase(),
      message,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore notification storage errors.
  }
};

/** Only merge local admin rejection; acceptance and technician progress come from the server. */
const applyStoredDecision = (item, decisions) => {
  const ticketId = item?.ticket?.id;
  if (!ticketId) return item;
  const decision = decisions[ticketId];
  if (!decision?.status || (decision.status || "").toUpperCase() !== "REJECTED") return item;
  const ticket = {
    ...item.ticket,
    status: decision.status,
    rejectionReason: decision.rejectionReason || "",
  };
  delete ticket.assignedTechnicianName;
  return {
    ...item,
    ticket,
  };
};

function toProgressPercent(status) {
  if (status === "OPEN") return 20;
  if (status === "ACCEPTED") return 40;
  if (status === "IN_PROGRESS") return 70;
  if (status === "RESOLVED") return 100;
  if (status === "REJECTED") return 0;
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

/** Maps ticket form categories to server technician specialty enums. */
const TICKET_CATEGORY_TO_TECHNICIAN = {
  "Electrical Issue": "ELECTRICAL",
  "Network Issue": "NETWORK",
  "Equipment Issue": "IT_SUPPORT",
  "Software Issue": "IT_SUPPORT",
  "Facility Issue": "FACILITIES",
  "Maintenance Issue": "MAINTENANCE",
  "Other": "GENERAL",
};

function normalizedTechnicianCategory(tech) {
  const c = tech?.technicianCategory;
  if (c == null || String(c).trim() === "") return "GENERAL";
  return String(c).toUpperCase();
}

/** Only technicians whose specialty equals the mapped enum for this ticket category (no fallback lists). */
function suitableTechniciansForTicket(allTechnicians, ticketCategory) {
  const list = Array.isArray(allTechnicians) ? allTechnicians : [];
  const mapped = TICKET_CATEGORY_TO_TECHNICIAN[ticketCategory];
  if (mapped == null) {
    return [];
  }
  const target = String(mapped).toUpperCase();
  return list
    .filter((t) => normalizedTechnicianCategory(t) === target)
    .sort((a, b) => {
      const av = (x) => (x && typeof x.technicianAvailable === "boolean" && x.technicianAvailable === false ? 0 : 1);
      return av(b) - av(a);
    });
}

function technicianKey(tech) {
  if (!tech) return "";
  if (tech.id != null && String(tech.id).trim() !== "") return String(tech.id);
  return String(tech.email || "");
}

function technicianDisplayName(tech) {
  if (!tech) return "";
  const n = `${(tech.firstName || "").trim()} ${(tech.lastName || "").trim()}`.trim();
  return n || tech.email || "Technician";
}

function humanizeAcceptTicketError(message) {
  const m = String(message || "");
  if (/\b404\b/.test(m)) {
    return "The server could not accept this ticket (404). Rebuild and restart the backend (latest code), use the dev server on port 8081 with Vite proxy, and stay signed in as admin.";
  }
  if (/\b403\b|Forbidden/i.test(m)) {
    return "Only an admin can accept tickets. Sign in with an admin account and try again.";
  }
  return m;
}

function getProgressInfo(status, commentsCount) {
  const normalizedStatus = (status || "").toUpperCase();
  if (normalizedStatus === "RESOLVED") {
    return { percent: 100, label: "Resolved", color: "#2e7d32" };
  }
  if (normalizedStatus === "REJECTED") {
    return { percent: 0, label: "Rejected", color: "#d32f2f" };
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
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("dashboard");
  /** { ticket, comments } when “Show details” modal is open */
  const [commentsModalPayload, setCommentsModalPayload] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");
  const [activeMenuItem, setActiveMenuItem] = useState("Dashboard");
  const [rejectModalTicket, setRejectModalTicket] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [acceptModalTicket, setAcceptModalTicket] = useState(null);
  const [acceptPanelTechnicians, setAcceptPanelTechnicians] = useState([]);
  const [acceptPanelLoading, setAcceptPanelLoading] = useState(false);
  const [acceptPanelError, setAcceptPanelError] = useState("");
  /** Why the list is empty: none-registered | no-match | unknown-category | "" */
  const [acceptPanelEmptyHint, setAcceptPanelEmptyHint] = useState("");
  const [acceptSelectedTechnicianKey, setAcceptSelectedTechnicianKey] = useState("");
  const [acceptConfirming, setAcceptConfirming] = useState(false);
  const [extraBarCollapsed, setExtraBarCollapsed] = useState(false);
  const [extraBarMenu, setExtraBarMenu] = useState("Ticket Management");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminTicketList();
        const decisions = getStoredDecisions();
        const list = Array.isArray(data) ? data : [];
        setTickets(list.map((item) => applyStoredDecision(item, decisions)));
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

  const openCommentsModalRow = (item) => {
    setCommentsModalPayload({
      ticket: item?.ticket || {},
      comments: Array.isArray(item?.comments) ? item.comments : [],
    });
  };

  const closeCommentsModal = () => setCommentsModalPayload(null);

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

    handleViewChange("dashboard");

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
    localStorage.removeItem("smartCampusAuthToken");
    window.location.href = "/";
  };

  const handleTicketDecision = (ticketId, decision, reason = "", assignedTechnicianName = "") => {
    setTickets((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) => {
        if (item?.ticket?.id !== ticketId) return item;
        const nextTicket = {
          ...item.ticket,
          status: decision,
          rejectionReason: decision === "REJECTED" ? reason : "",
        };
        if (decision === "ACCEPTED" && assignedTechnicianName) {
          nextTicket.assignedTechnicianName = assignedTechnicianName;
        } else {
          delete nextTicket.assignedTechnicianName;
        }
        storeDecision(
          ticketId,
          decision,
          decision === "REJECTED" ? reason : "",
          decision === "ACCEPTED" ? assignedTechnicianName : ""
        );
        pushUserNotification(nextTicket, decision, reason);
        return {
          ...item,
          ticket: nextTicket,
        };
      })
    );
  };

  const closeRejectModal = () => {
    setRejectModalTicket(null);
    setRejectionReason("");
    setRejectionError("");
  };

  const openRejectionForm = (ticket) => {
    if (!ticket?.id) return;
    setAcceptModalTicket(null);
    setAcceptPanelTechnicians([]);
    setAcceptPanelEmptyHint("");
    setAcceptPanelError("");
    setRejectModalTicket({ id: ticket.id, issueTitle: ticket.issueTitle || "" });
    setRejectionReason("");
    setRejectionError("");
  };

  const openAcceptPanel = async (ticket) => {
    if (!ticket?.id) return;
    setRejectModalTicket(null);
    setRejectionReason("");
    setRejectionError("");
    setAcceptModalTicket({
      id: ticket.id,
      issueTitle: ticket.issueTitle || "",
      category: ticket.category || "",
      status: ticket.status || "",
    });
    setAcceptPanelLoading(true);
    setAcceptPanelError("");
    setAcceptPanelEmptyHint("");
    setAcceptPanelTechnicians([]);
    setAcceptSelectedTechnicianKey("");
    try {
      const all = await listTechnicians();
      const cat = ticket.category || "";
      const suitable = suitableTechniciansForTicket(all, cat);
      setAcceptPanelTechnicians(suitable);
      if (suitable.length > 0) {
        setAcceptSelectedTechnicianKey(technicianKey(suitable[0]));
      }
      if (suitable.length === 0) {
        if (!Array.isArray(all) || all.length === 0) {
          setAcceptPanelEmptyHint("none-registered");
        } else if (TICKET_CATEGORY_TO_TECHNICIAN[cat] == null) {
          setAcceptPanelEmptyHint("unknown-category");
        } else {
          setAcceptPanelEmptyHint("no-match");
        }
      }
    } catch (err) {
      setAcceptPanelError(err?.message || "Could not load technicians.");
    } finally {
      setAcceptPanelLoading(false);
    }
  };

  const closeAcceptPanel = () => {
    setAcceptModalTicket(null);
    setAcceptPanelTechnicians([]);
    setAcceptPanelEmptyHint("");
    setAcceptPanelError("");
    setAcceptSelectedTechnicianKey("");
  };

  const confirmAcceptTicket = async () => {
    if (!acceptModalTicket?.id) return;
    const tech = acceptPanelTechnicians.find((t) => technicianKey(t) === acceptSelectedTechnicianKey);
    const name = tech ? technicianDisplayName(tech) : "";
    if (!tech || !name) return;
    const ticketId = acceptModalTicket.id;
    setAcceptConfirming(true);
    setAcceptPanelError("");
    try {
      const wrap = await acceptAdminTicket(ticketId, {
        technicianId: technicianKey(tech),
        technicianName: name,
      });
      const serverTicket = wrap?.ticket;
      const serverComments = wrap?.comments;
      setTickets((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) => {
          if (item?.ticket?.id !== ticketId) return item;
          const nextTicket = serverTicket
            ? { ...item.ticket, ...serverTicket }
            : { ...item.ticket, status: "ACCEPTED", assignedTechnicianName: name };
          const assignee = nextTicket.assignedTechnicianName || name;
          storeDecision(ticketId, "ACCEPTED", "", assignee);
          pushUserNotification(nextTicket, "ACCEPTED", "");
          return {
            ...item,
            ticket: nextTicket,
            comments: Array.isArray(serverComments) ? serverComments : item.comments,
          };
        })
      );
      closeAcceptPanel();
    } catch (err) {
      setAcceptPanelError(err?.message || "Could not save acceptance. Check admin login and server.");
    } finally {
      setAcceptConfirming(false);
    }
  };

  const submitRejection = () => {
    if (!rejectModalTicket?.id) return;
    const ticketId = rejectModalTicket.id;
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionError("Rejection reason is required.");
      return;
    }
    if (!hasOnlyAllowedTextChars(reason)) {
      setRejectionError("Rejection reason cannot contain special characters.");
      return;
    }
    if (hasTooManyRepeatedChars(reason)) {
      setRejectionError("Rejection reason cannot repeat the same character many times.");
      return;
    }

    handleTicketDecision(ticketId, "REJECTED", reason);
    closeRejectModal();
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

  useEffect(() => {
    if (activeView === "tickets") {
      setExtraBarMenu("Ticket Management");
    }
  }, [activeView]);

  const handleExtraBarNav = (item) => {
    const keepTicketBarActive =
      item === "Dashboard" || item === "Resource Management" || item === "Booking Management" || item === "Notification";
    if (!keepTicketBarActive) {
      setExtraBarMenu(item);
    }
    if (item === "Ticket Management") {
      setActiveMenuItem("Dashboard");
      handleViewChange("dashboard");
      return;
    }
    if (item === "Dashboard") {
      navigate("/admin");
      return;
    }
    if (item === "Resource Management" || item === "Booking Management") {
      return;
    }
    if (item === "Analytics & Report") {
      navigateFromSidebar("Reports");
      return;
    }
    if (item === "User Management") {
      navigate("/admin");
      return;
    }
    if (item === "Notification") {
      return;
    }
    handleViewChange("dashboard");
  };

  const handleExtraBarHover = (e, isHover, isActive) => {
    if (isActive) return;
    e.currentTarget.style.background = isHover ? "rgba(250, 129, 18, 0.2)" : "transparent";
    e.currentTarget.style.color = isHover ? "#fb923c" : "#cbd5e1";
    e.currentTarget.style.borderColor = isHover ? "#FA8112" : "transparent";
  };

  const renderExtraSidebar = () => (
    <aside
      style={{
        ...extraBarStyle,
        width: extraBarCollapsed ? EXTRA_BAR_WIDTH_COLLAPSED : EXTRA_BAR_WIDTH_EXPANDED,
        overflow: "hidden",
        padding: extraBarCollapsed ? "12px 6px" : "14px 10px 10px",
        borderRadius: extraBarCollapsed ? "16px 0 0 16px" : "12px",
        background: extraBarCollapsed ? "#14213D" : "linear-gradient(180deg, #14213D 0%, #1a2d4d 100%)",
        alignItems: extraBarCollapsed ? "center" : "stretch",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: extraBarCollapsed ? "center" : "space-between",
          gap: "8px",
          marginBottom: extraBarCollapsed ? 0 : "8px",
          padding: extraBarCollapsed ? 0 : "0 4px",
          width: "100%",
        }}
      >
        {!extraBarCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #FA8112, #F5E7C6)", color: "#FFFFFF", fontWeight: 800, fontSize: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>A</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "30px", color: "#f8fafc", lineHeight: 1 }}>Admin</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600, marginTop: "3px" }}>Smart Campus</div>
            </div>
          </div>
        )}
        <button
          type="button"
          aria-label={extraBarCollapsed ? "Expand menu" : "Collapse menu"}
          onClick={() => setExtraBarCollapsed((v) => !v)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: extraBarCollapsed ? "transparent" : "rgba(148, 163, 184, 0.12)",
            border: extraBarCollapsed ? "1px solid rgba(255, 255, 255, 0.92)" : "none",
            color: "#e2e8f0",
            fontSize: "18px",
            fontWeight: 900,
            lineHeight: 1,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <span style={extraBarToggleHamburgerStyle} aria-hidden>
            <span style={extraBarHamburgerLineStyle} />
            <span style={extraBarHamburgerLineStyle} />
            <span style={extraBarHamburgerLineStyle} />
          </span>
        </button>
      </div>
      {!extraBarCollapsed && (
        <>
          <div style={extraBarLabelStyle}>MENU</div>
          <div style={{ display: "grid", gap: "6px", marginBottom: "14px", padding: "0 4px" }}>
            <button type="button" style={extraBarItemStyle(false)} onClick={() => handleExtraBarNav("Dashboard")} onMouseEnter={(e) => handleExtraBarHover(e, true, false)} onMouseLeave={(e) => handleExtraBarHover(e, false, false)}>Dashboard</button>
            <button type="button" style={extraBarItemStyle(extraBarMenu === "Resource Management")} onMouseEnter={(e) => handleExtraBarHover(e, true, extraBarMenu === "Resource Management")} onMouseLeave={(e) => handleExtraBarHover(e, false, extraBarMenu === "Resource Management")}>Resource Management</button>
            <button type="button" style={extraBarItemStyle(extraBarMenu === "Booking Management")} onMouseEnter={(e) => handleExtraBarHover(e, true, extraBarMenu === "Booking Management")} onMouseLeave={(e) => handleExtraBarHover(e, false, extraBarMenu === "Booking Management")}>Booking Management</button>
            <button type="button" style={extraBarItemStyle(extraBarMenu === "Ticket Management")} onClick={() => handleExtraBarNav("Ticket Management")} onMouseEnter={(e) => handleExtraBarHover(e, true, extraBarMenu === "Ticket Management")} onMouseLeave={(e) => handleExtraBarHover(e, false, extraBarMenu === "Ticket Management")}>Ticket Management</button>
            <button type="button" style={extraBarItemStyle(extraBarMenu === "User Management")} onClick={() => handleExtraBarNav("User Management")} onMouseEnter={(e) => handleExtraBarHover(e, true, extraBarMenu === "User Management")} onMouseLeave={(e) => handleExtraBarHover(e, false, extraBarMenu === "User Management")}>User Management</button>
            <button type="button" style={extraBarItemStyle(extraBarMenu === "Notification")} onClick={() => handleExtraBarNav("Notification")} onMouseEnter={(e) => handleExtraBarHover(e, true, extraBarMenu === "Notification")} onMouseLeave={(e) => handleExtraBarHover(e, false, extraBarMenu === "Notification")}>Notification</button>
            <button type="button" style={extraBarItemStyle(extraBarMenu === "Analytics & Report")} onClick={() => handleExtraBarNav("Analytics & Report")} onMouseEnter={(e) => handleExtraBarHover(e, true, extraBarMenu === "Analytics & Report")} onMouseLeave={(e) => handleExtraBarHover(e, false, extraBarMenu === "Analytics & Report")}>Analytics & Report</button>
          </div>
        </>
      )}
      {!extraBarCollapsed && (
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(148, 163, 184, 0.15)", padding: "12px 8px 6px" }}>
          <button type="button" style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(248, 113, 113, 0.35)", background: "rgba(127, 29, 29, 0.35)", color: "#fecaca", fontWeight: 700, fontSize: "14px", cursor: "pointer" }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div style={pageStyle}>
      {renderExtraSidebar()}
      <section style={{ ...containerStyle, marginLeft: extraBarCollapsed ? `${8 + EXTRA_BAR_WIDTH_COLLAPSED + 8}px` : "270px" }}>
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
            <aside style={{ ...extraBarStyle, display: "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px", padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #FA8112, #F5E7C6)", color: "#FFFFFF", fontWeight: 800, fontSize: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>A</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "30px", color: "#f8fafc", lineHeight: 1 }}>Admin</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600, marginTop: "3px" }}>Smart Campus</div>
                  </div>
                </div>
                <button type="button" aria-label="Menu" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(148, 163, 184, 0.12)", border: "none", color: "#e2e8f0", fontSize: "18px", fontWeight: 900, lineHeight: 1, cursor: "default", flexShrink: 0 }}>≡</button>
              </div>
              <div style={extraBarLabelStyle}>MENU</div>
              <div style={{ display: "grid", gap: "6px", marginBottom: "14px", padding: "0 4px" }}>
                <button type="button" style={extraBarItemStyle(activeMenuItem === "Dashboard")}>Dashboard</button>
                <button type="button" style={extraBarItemStyle(false)}>Resource Management</button>
                <button type="button" style={extraBarItemStyle(false)}>Booking Management</button>
                <button type="button" style={extraBarItemStyle(activeMenuItem === "Tickets")} onClick={() => navigateFromSidebar("Tickets")}>Ticket Management</button>
                <button type="button" style={extraBarItemStyle(false)}>User Management</button>
                <button type="button" style={extraBarItemStyle(false)}>Notification</button>
                <button type="button" style={extraBarItemStyle(activeMenuItem === "Reports")} onClick={() => navigateFromSidebar("Reports")}>Analytics & Report</button>
              </div>
              <div style={{ marginTop: "auto", borderTop: "1px solid rgba(148, 163, 184, 0.15)", padding: "12px 8px 6px" }}>
                <button type="button" style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(248, 113, 113, 0.35)", background: "rgba(127, 29, 29, 0.35)", color: "#fecaca", fontWeight: 700, fontSize: "14px", cursor: "pointer" }} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </aside>
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
                {ADMIN_SIDEBAR_ITEMS.map((item) => (
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
            <aside style={{ ...extraBarStyle, display: "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px", padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, #FA8112, #F5E7C6)", color: "#FFFFFF", fontWeight: 800, fontSize: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>A</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "30px", color: "#f8fafc", lineHeight: 1 }}>Admin</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600, marginTop: "3px" }}>Smart Campus</div>
                  </div>
                </div>
                <button type="button" aria-label="Menu" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(148, 163, 184, 0.12)", border: "none", color: "#e2e8f0", fontSize: "18px", fontWeight: 900, lineHeight: 1, cursor: "default", flexShrink: 0 }}>≡</button>
              </div>
              <div style={extraBarLabelStyle}>MENU</div>
              <div style={{ display: "grid", gap: "6px", marginBottom: "14px", padding: "0 4px" }}>
                <button type="button" style={extraBarItemStyle(activeMenuItem === "Dashboard")}>Dashboard</button>
                <button type="button" style={extraBarItemStyle(false)}>Resource Management</button>
                <button type="button" style={extraBarItemStyle(false)}>Booking Management</button>
                <button type="button" style={extraBarItemStyle(activeMenuItem === "Tickets")} onClick={() => navigateFromSidebar("Tickets")}>Ticket Management</button>
                <button type="button" style={extraBarItemStyle(false)}>User Management</button>
                <button type="button" style={extraBarItemStyle(false)}>Notification</button>
                <button type="button" style={extraBarItemStyle(activeMenuItem === "Reports")} onClick={() => navigateFromSidebar("Reports")}>Analytics & Report</button>
              </div>
              <div style={{ marginTop: "auto", borderTop: "1px solid rgba(148, 163, 184, 0.15)", padding: "12px 8px 6px" }}>
                <button type="button" style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(248, 113, 113, 0.35)", background: "rgba(127, 29, 29, 0.35)", color: "#fecaca", fontWeight: 700, fontSize: "14px", cursor: "pointer" }} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </aside>
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
                {ADMIN_SIDEBAR_ITEMS.map((item) => (
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

              {!loading && !error && filteredAndSortedTickets.length > 0 && (
                <div style={{ border: "1px solid #F5E7C6", borderRadius: "12px", overflowX: "auto", backgroundColor: "#FFFFFF" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1020px", tableLayout: "fixed" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#FAF3E1" }}>
                        <th style={{ width: "18%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Ticket</th>
                        <th style={{ width: "15%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Reported By</th>
                        <th style={{ width: "12%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Status</th>
                        <th style={{ width: "10%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Priority</th>
                        <th style={{ width: "11%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Progress</th>
                        <th style={{ width: "12%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Assigned to</th>
                        <th style={{ width: "11%", textAlign: "left", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Created</th>
                        <th style={{ width: "11%", textAlign: "right", padding: "12px", borderBottom: "1px solid #F5E7C6", color: "#374151", fontSize: "13px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedTickets.map((item) => {
                        const ticket = item.ticket || {};
                        const comments = item.comments || [];
                        const progress = getProgressInfo(ticket.status, comments.length);
                        const statusU = (ticket.status || "").toUpperCase();

                        return (
                          <React.Fragment key={ticket.id}>
                            <tr>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "top", wordBreak: "break-word" }}>
                                <div style={{ fontWeight: 800, color: "#14213D", marginBottom: "4px" }}>{ticket.issueTitle || "Untitled Ticket"}</div>
                                <div style={{ color: "#374151", fontSize: "13px" }}>Location: {ticket.resourceLocation || "N/A"}</div>
                                <div style={{ marginTop: "6px", color: "#6b7280", fontSize: "12px", lineHeight: 1.4 }}>
                                  {ticket.description || "No description provided."}
                                </div>
                                {statusU === "RESOLVED" && (ticket.resolutionDetails || "").trim() && (
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      padding: "8px 10px",
                                      borderRadius: "8px",
                                      border: "1px solid #c8e6c9",
                                      backgroundColor: "#f1f8e9",
                                      color: "#374151",
                                      fontSize: "12px",
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    <span style={{ fontWeight: 800, color: "#14213D" }}>Resolution: </span>
                                    {ticket.resolutionDetails}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "top", color: "#374151", fontSize: "13px", wordBreak: "break-word" }}>
                                <div style={{ fontWeight: 700, color: "#222222" }}>{ticket.fullName || "N/A"}</div>
                                <div style={{ marginTop: "2px" }}>{ticket.email || "N/A"}</div>
                                <div style={{ marginTop: "2px" }}>{ticket.phoneNumber || "N/A"}</div>
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "middle" }}>
                                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
                                  <span style={{ ...tableChipStyle, backgroundColor: "#14213D", color: "#FFFFFF" }}>{ticket.status || "N/A"}</span>
                                </div>
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "middle" }}>
                                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
                                  <span
                                    style={{
                                      ...tableChipStyle,
                                      backgroundColor:
                                        ticket.priority === "High" ? "#d32f2f" : ticket.priority === "Medium" ? "#FCA311" : "#2e7d32",
                                      color: "#FFFFFF",
                                    }}
                                  >
                                    {ticket.priority || "N/A"}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "top" }}>
                                <div style={{ color: "#374151", fontWeight: 600, fontSize: "12px" }}>{progress.percent}%</div>
                                <div style={{ color: "#6b7280", fontSize: "12px", margin: "4px 0 6px" }}>{progress.label}</div>
                                <div style={{ height: "8px", backgroundColor: "#FAF3E1", border: "1px solid #F5E7C6", borderRadius: "999px", overflow: "hidden" }}>
                                  <div style={{ width: `${progress.percent}%`, height: "100%", backgroundColor: progress.color }} />
                                </div>
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "top", color: "#374151", fontSize: "12px", wordBreak: "break-word" }}>
                                {ticket.assignedTechnicianName || "—"}
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "top", color: "#6b7280", fontSize: "12px" }}>
                                {formatDate(ticket.createdAt)}
                              </td>
                              <td style={{ padding: "12px", borderBottom: "1px solid #F5E7C6", verticalAlign: "top" }}>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                  {statusU === "OPEN" && (
                                    <button
                                      type="button"
                                      style={{ ...buttonStyle, backgroundColor: "#2e7d32", minWidth: "74px", padding: "8px 10px", fontSize: "12px" }}
                                      onClick={() => openAcceptPanel(ticket)}
                                      disabled={acceptModalTicket != null || rejectModalTicket != null}
                                    >
                                      Accept
                                    </button>
                                  )}
                                  {statusU === "OPEN" && (
                                    <button
                                      type="button"
                                      style={{ ...buttonStyle, backgroundColor: "#d32f2f", minWidth: "74px", padding: "8px 10px", fontSize: "12px" }}
                                      onClick={() => openRejectionForm(ticket)}
                                      disabled={rejectModalTicket != null || acceptModalTicket != null}
                                    >
                                      Reject
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    style={{ ...buttonStyle, minWidth: "96px", padding: "8px 10px", fontSize: "12px" }}
                                    onClick={() => openCommentsModalRow(item)}
                                  >
                                    Show Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {acceptModalTicket && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-tech-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAcceptPanel();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "min(520px, 85vh)",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#fff",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #F5E7C6",
                backgroundColor: "#FAF3E1",
                flexShrink: 0,
              }}
            >
              <div id="accept-tech-modal-title" style={{ fontSize: 16, fontWeight: 900, color: "#14213D" }}>
                Suitable technicians
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>
                {acceptModalTicket.issueTitle || "Ticket"}
                {acceptModalTicket.category ? (
                  <>
                    {" "}
                    · <span style={{ color: "#14213D" }}>{acceptModalTicket.category}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div style={{ padding: 14, overflowY: "auto", flex: 1, minHeight: 0 }}>
              <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 10, lineHeight: 1.45 }}>
                Select a technician to assign. Only technicians whose specialty matches this ticket’s category are listed.
              </div>
              {acceptModalTicket?.category && TICKET_CATEGORY_TO_TECHNICIAN[acceptModalTicket.category] != null && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#14213D", marginBottom: 10 }}>
                  Required specialty:{" "}
                  {technicianCategoryLabel(TICKET_CATEGORY_TO_TECHNICIAN[acceptModalTicket.category])}
                </div>
              )}
              {acceptPanelLoading && <p style={{ margin: 0, color: "#6b7280" }}>Loading technicians…</p>}
              {!acceptPanelLoading &&
                !acceptPanelError &&
                acceptPanelTechnicians.length === 0 &&
                acceptPanelEmptyHint === "none-registered" && (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>No technicians registered yet.</p>
                )}
              {!acceptPanelLoading &&
                !acceptPanelError &&
                acceptPanelTechnicians.length === 0 &&
                acceptPanelEmptyHint === "no-match" && (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13, lineHeight: 1.45 }}>
                    No technician has this specialty ({acceptModalTicket?.category || "—"}). Add one from the admin technician
                    page or choose a different category on the ticket.
                  </p>
                )}
              {!acceptPanelLoading &&
                !acceptPanelError &&
                acceptPanelTechnicians.length === 0 &&
                acceptPanelEmptyHint === "unknown-category" && (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13, lineHeight: 1.45 }}>
                    This ticket’s category is not mapped for technician assignment. Update the ticket category to a standard
                    type (e.g. Electrical Issue, Network Issue).
                  </p>
                )}
              {!acceptPanelLoading && acceptPanelTechnicians.length > 0 && (
                <div style={{ display: "grid", gap: 8 }} role="radiogroup" aria-label="Choose technician">
                  {acceptPanelTechnicians.map((tech) => {
                    const tKey = technicianKey(tech);
                    const selected = acceptSelectedTechnicianKey === tKey;
                    const avail =
                      tech && typeof tech.technicianAvailable === "boolean"
                        ? tech.technicianAvailable
                          ? "Available"
                          : "Unavailable"
                        : "—";
                    const availColor =
                      tech && typeof tech.technicianAvailable === "boolean"
                        ? tech.technicianAvailable
                          ? "#2e7d32"
                          : "#92400e"
                        : "#6b7280";
                    return (
                      <button
                        type="button"
                        key={tKey || tech.email}
                        onClick={() => setAcceptSelectedTechnicianKey(tKey)}
                        style={{
                          border: selected ? "2px solid #14213D" : "1px solid #F5E7C6",
                          borderRadius: 10,
                          padding: "10px 12px",
                          backgroundColor: selected ? "#fff" : "#FAF3E1",
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          cursor: "pointer",
                          textAlign: "left",
                          font: "inherit",
                        }}
                      >
                        <input
                          type="radio"
                          name="accept-technician"
                          checked={selected}
                          onChange={() => setAcceptSelectedTechnicianKey(tKey)}
                          style={{ width: 16, height: 16, accentColor: "#14213D", margin: 0 }}
                          aria-label={`Assign to ${technicianDisplayName(tech)}`}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: "#14213D", fontSize: 13 }}>{technicianDisplayName(tech)}</div>
                          <div style={{ marginTop: 2, fontSize: 12, color: "#374151", wordBreak: "break-word" }}>{tech.email || "—"}</div>
                          <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                            {technicianCategoryLabel(tech.technicianCategory)}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: availColor, textAlign: "right", whiteSpace: "nowrap" }}>{avail}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {acceptPanelError && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    backgroundColor: "#ffebee",
                    border: "1px solid #ffcdd2",
                    color: "#c62828",
                    fontSize: "13px",
                    fontWeight: 600,
                    lineHeight: 1.45,
                  }}
                >
                  {humanizeAcceptTicketError(acceptPanelError)}
                </div>
              )}
            </div>
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #F5E7C6",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                flexShrink: 0,
                backgroundColor: "#fff",
              }}
            >
              <button type="button" style={{ ...buttonStyle, backgroundColor: "#6b7280", padding: "10px 14px" }} onClick={closeAcceptPanel}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: "#2e7d32", padding: "10px 14px" }}
                onClick={confirmAcceptTicket}
                disabled={
                  acceptPanelLoading ||
                  acceptConfirming ||
                  (acceptModalTicket.status || "").toUpperCase() === "ACCEPTED" ||
                  acceptPanelTechnicians.length === 0 ||
                  !acceptSelectedTechnicianKey
                }
              >
                {acceptConfirming ? "Saving…" : "Confirm accept"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalTicket && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-ticket-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2100,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRejectModal();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#fff",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #F5E7C6",
                backgroundColor: "#FAF3E1",
              }}
            >
              <div id="reject-ticket-modal-title" style={{ fontSize: 16, fontWeight: 900, color: "#14213D" }}>
                Reject ticket
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>
                {rejectModalTicket.issueTitle || "Ticket"}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <label htmlFor="reject-reason-textarea" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                Rejection reason
              </label>
              <textarea
                id="reject-reason-textarea"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason (letters and numbers only)"
                rows={4}
                style={{
                  width: "100%",
                  minHeight: "88px",
                  resize: "vertical",
                  border: "2px solid #F5E7C6",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#FFFFFF",
                }}
              />
              {rejectionError && (
                <div style={{ marginTop: "10px", color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{rejectionError}</div>
              )}
            </div>
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #F5E7C6",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                backgroundColor: "#fff",
              }}
            >
              <button type="button" style={{ ...buttonStyle, backgroundColor: "#6b7280", padding: "10px 14px" }} onClick={closeRejectModal}>
                Cancel
              </button>
              <button
                type="button"
                style={{ ...buttonStyle, backgroundColor: "#d32f2f", padding: "10px 14px" }}
                onClick={submitRejection}
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {commentsModalPayload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-comments-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2020,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCommentsModal();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "min(520px, 85vh)",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#fff",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #F5E7C6",
                backgroundColor: "#FAF3E1",
                flexShrink: 0,
              }}
            >
              <div id="ticket-comments-modal-title" style={{ fontSize: 16, fontWeight: 900, color: "#14213D" }}>
                Ticket details
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 4, lineHeight: 1.4 }}>
                {commentsModalPayload.ticket.issueTitle || "Ticket"}
                {commentsModalPayload.ticket.category ? (
                  <>
                    {" "}
                    · <span style={{ color: "#14213D" }}>{commentsModalPayload.ticket.category}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div style={{ padding: 16, overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
              {(commentsModalPayload.ticket.status || "").toUpperCase() === "REJECTED" &&
                commentsModalPayload.ticket.rejectionReason && (
                  <div
                    style={{
                      marginBottom: 14,
                      border: "1px solid #F5E7C6",
                      borderRadius: 12,
                      padding: "12px",
                      backgroundColor: "#fff5f5",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#991b1b", letterSpacing: "0.04em" }}>
                      Rejection reason
                    </div>
                    <div style={{ marginTop: 6, color: "#374151", fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
                      {commentsModalPayload.ticket.rejectionReason}
                    </div>
                  </div>
                )}
              {(commentsModalPayload.ticket.status || "").toUpperCase() === "RESOLVED" &&
                (commentsModalPayload.ticket.resolutionDetails || "").trim() && (
                  <div
                    style={{
                      marginBottom: 14,
                      border: "1px solid #c8e6c9",
                      borderRadius: 12,
                      padding: "12px",
                      backgroundColor: "#f1f8e9",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#14213D", letterSpacing: "0.04em" }}>
                      Resolution details
                    </div>
                    <div style={{ marginTop: 6, color: "#374151", fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
                      {commentsModalPayload.ticket.resolutionDetails}
                    </div>
                  </div>
                )}
              <div style={sectionTitleStyle}>Comments</div>
              {commentsModalPayload.comments.length === 0 ? (
                <p style={{ margin: 0, color: "#6b7280" }}>No comments yet.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {commentsModalPayload.comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        border: "1px solid #F5E7C6",
                        borderRadius: "12px",
                        padding: "12px",
                        backgroundColor: "#FAF3E1",
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
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #F5E7C6",
                display: "flex",
                justifyContent: "flex-end",
                flexShrink: 0,
                backgroundColor: "#fff",
              }}
            >
              <button type="button" style={{ ...buttonStyle, backgroundColor: "#6b7280", padding: "10px 14px" }} onClick={closeCommentsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

