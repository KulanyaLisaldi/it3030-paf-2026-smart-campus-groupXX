import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createTechnician, listTechnicians } from "../api/adminTechnicians";
import {
  DEFAULT_TECHNICIAN_CATEGORY,
  TECHNICIAN_CATEGORIES,
  technicianCategoryLabel,
  toApiTechnicianCategory,
} from "../constants/technicianCategories";
import {
  fetchCurrentUser,
  removeProfileAvatar,
  updateProfilePhone,
  updateTechnicianAvailability,
  uploadProfileAvatar,
} from "../api/auth";
import { getTechnicianAssignedTickets, updateTechnicianTicketProgress } from "../api/technicianTickets";
import { getTicketDetails } from "../api/tickets";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../utils/campusUserStorage";
import PasswordInput from "../components/PasswordInput.jsx";
import TicketTechnicianChat from "../components/TicketTechnicianChat.jsx";
import { formatDurationSeconds, formatTicketInstant } from "../utils/slaFormat";
import { appFontFamily as techFontUi } from "../utils/appFont";

const PHONE_PATTERN = /^[0-9+\-()\s]{7,20}$/;

function isValidPhone(value) {
  const t = (value || "").trim();
  return t.length > 0 && PHONE_PATTERN.test(t);
}

const pageStyleBase = {
  minHeight: "100vh",
  backgroundColor: "#FFFFFF",
  padding: "28px 16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
  fontFamily: techFontUi,
};

const containerStyle = {
  width: "100%",
  maxWidth: "720px",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.08)",
  padding: "28px",
  flexShrink: 0,
};

const technicianCardStyle = {
  ...containerStyle,
  maxWidth: "min(1280px, 100%)",
  width: "100%",
  margin: "0 auto",
  minHeight: "calc(100vh - 40px)",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  fontFamily: techFontUi,
};

const selectStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: techFontUi,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: techFontUi,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "8px",
};

const TECH_TICKET_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const TECH_TICKET_PRIORITY_FILTER_OPTIONS = [
  { value: "ALL", label: "All priorities" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const techTicketFilterBarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  alignItems: "center",
  marginBottom: "12px",
  padding: "14px",
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 4px 12px rgba(20, 33, 61, 0.04)",
};

const techTicketFilterSelectStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: techFontUi,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  minWidth: "158px",
  boxSizing: "border-box",
  width: "auto",
};

const techTicketFilterSearchStyle = {
  ...techTicketFilterSelectStyle,
  flex: "1 1 220px",
  minWidth: "200px",
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem("smartCampusUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function userDisplayInitial(user) {
  if (!user) return "?";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "T";
}

function assignedTicketStatusLabel(status) {
  const s = (status || "").toUpperCase();
  if (s === "ACCEPTED") return "Accepted — ready to start";
  if (s === "IN_PROGRESS") return "In progress";
  if (s === "RESOLVED") return "Resolved";
  return status || "—";
}

function normalizeTicketAttachments(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function technicianSpecialtyText(source) {
  const list = Array.isArray(source?.technicianCategories) ? source.technicianCategories : [];
  const normalized = list.map((v) => String(v || "").toUpperCase().trim()).filter(Boolean);
  if (normalized.length > 0) {
    return normalized.map((v) => technicianCategoryLabel(v)).join(", ");
  }
  return technicianCategoryLabel(source?.technicianCategory);
}

function formatModalDate(value) {
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  } catch {
    return "";
  }
}

/** Same layout as My Tickets timeline panel */
const techTimelinePanelStyle = {
  marginTop: "12px",
  marginBottom: "12px",
  borderRadius: "12px",
  border: "1px solid #F5E7C6",
  backgroundColor: "#FFFFFF",
  overflow: "hidden",
  fontFamily: techFontUi,
};
const techTimelineHeaderBarStyle = {
  padding: "11px 16px",
  backgroundColor: "#FAF3E1",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#14213D",
};
const techTimelineHeaderButtonStyle = {
  ...techTimelineHeaderBarStyle,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
  textAlign: "left",
  boxSizing: "border-box",
};
const techTimelineRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  gap: "8px 16px",
  alignItems: "center",
  padding: "10px 16px",
  fontSize: "13px",
  borderBottom: "1px solid #f0ebe0",
};
const techTimelineLabelStyle = {
  color: "#6b7280",
  fontWeight: 600,
  lineHeight: 1.4,
  minWidth: 0,
};
const techTimelineValueStyle = {
  color: "#374151",
  fontWeight: 600,
  textAlign: "right",
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  justifySelf: "end",
};
const techTimelineMetricsRowStyle = {
  ...techTimelineRowStyle,
  backgroundColor: "#faf9f6",
  borderBottom: "none",
};

function techShellNavRowStyle(active) {
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

function techShellInitial(user) {
  if (!user) return "T";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "T";
}

function techShellDisplayName(user) {
  if (!user) return "Technician";
  const first = (user.firstName || "").trim();
  if (first) return first;
  const em = (user.email || "").trim();
  if (em && em.includes("@")) return em.split("@")[0];
  return "Technician";
}

const techShellSectionLabelStyle = {
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

  const sidebarDisplayName = techShellDisplayName(user);
  const sidebarEmail = (user?.email || "").trim() || "—";

  const openMyProfile = () => {
    setProfileMenuOpen(false);
    if (path === "/technician") {
      window.dispatchEvent(new Event("smart-campus-technician-open-profile"));
    }
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
        fontFamily: techFontUi,
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
                {techShellInitial(user)}
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
          {!sidebarCollapsed && <div style={techShellSectionLabelStyle}>MENU</div>}
          {!sidebarCollapsed && (
            <>
              <Link
                to="/technician/tickets"
                style={{ ...techShellNavRowStyle(isTicketDashboardActive), textDecoration: "none", display: "block" }}
              >
                Dashboard
              </Link>
              <Link
                to="/technician#technician-personal-details"
                style={{ ...techShellNavRowStyle(isPersonalDetailsActive), textDecoration: "none", display: "block" }}
              >
                Personal details
              </Link>
              <div style={techShellSectionLabelStyle}>Assign tickets</div>
              <Link
                to="/technician"
                style={{ ...techShellNavRowStyle(isTechnicianHomeActive), textDecoration: "none", display: "block" }}
              >
                Assign technician
              </Link>
              <Link
                to="/technician#technician-assigned-tickets"
                style={{ ...techShellNavRowStyle(isMyAssignmentActive), textDecoration: "none", display: "block" }}
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
            fontFamily: techFontUi,
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
              {techShellInitial(user)}
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
              fontFamily: techFontUi,
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
          padding: "20px clamp(16px, 4vw, 32px)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TechnicianWorkspace() {
  const location = useLocation();
  const [userRev, setUserRev] = useState(0);
  const techUser = useMemo(() => readCampusUser(), [userRev]);
  const name = (techUser?.firstName || techUser?.email || "Technician").trim();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const avatarFileRef = useRef(null);

  const [phoneDraft, setPhoneDraft] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");

  const [assignedTickets, setAssignedTickets] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedError, setAssignedError] = useState("");
  const [techTicketStatusFilter, setTechTicketStatusFilter] = useState("ALL");
  const [techTicketPriorityFilter, setTechTicketPriorityFilter] = useState("ALL");
  const [techTicketSearch, setTechTicketSearch] = useState("");
  const [progressBusyId, setProgressBusyId] = useState("");

  const [resolvePanelTicketId, setResolvePanelTicketId] = useState(null);
  const [resolutionDraftByTicketId, setResolutionDraftByTicketId] = useState({});
  const [resolveFormError, setResolveFormError] = useState("");

  const [ticketDetailModalId, setTicketDetailModalId] = useState(null);
  const [ticketDetailModalData, setTicketDetailModalData] = useState(null);
  const [ticketDetailModalLoading, setTicketDetailModalLoading] = useState(false);
  const [ticketDetailModalError, setTicketDetailModalError] = useState("");
  const [techChatPopupOpen, setTechChatPopupOpen] = useState(false);
  const [techTimelineExpanded, setTechTimelineExpanded] = useState(true);

  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const isTechnicianAvailable = techUser?.technicianAvailable !== false;

  const filteredAssignedTickets = useMemo(() => {
    const q = techTicketSearch.trim().toLowerCase();
    return assignedTickets.filter((t) => {
      if (techTicketStatusFilter !== "ALL" && (t.status || "").toUpperCase() !== techTicketStatusFilter) return false;
      if (techTicketPriorityFilter !== "ALL" && (t.priority || "") !== techTicketPriorityFilter) return false;
      if (q) {
        const hay = `${t.issueTitle || ""} ${t.description || ""} ${t.category || ""} ${t.resourceLocation || ""} ${t.fullName || ""} ${t.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assignedTickets, techTicketStatusFilter, techTicketPriorityFilter, techTicketSearch]);

  const techTicketFiltersActive =
    techTicketStatusFilter !== "ALL" ||
    techTicketPriorityFilter !== "ALL" ||
    techTicketSearch.trim() !== "";

  const clearTechTicketFilters = () => {
    setTechTicketStatusFilter("ALL");
    setTechTicketPriorityFilter("ALL");
    setTechTicketSearch("");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await fetchCurrentUser();
        if (!cancelled && u?.id) {
          persistCampusUser(u);
        }
      } catch {
        // signed-out or network; keep cached campus user
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep-linking: sidebar targets within this page.
  useEffect(() => {
    const map = {
      "#technician-personal-details": "technician-personal-details",
      "#technician-assigned-tickets": "technician-assigned-tickets",
    };
    const elId = map[location.hash];
    if (!elId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(elId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(t);
  }, [location.hash]);

  useEffect(() => {
    const onUserUpdated = () => setUserRev((n) => n + 1);
    window.addEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
    return () => window.removeEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
  }, []);

  useEffect(() => {
    const onOpen = () => setProfileModalOpen(true);
    window.addEventListener("smart-campus-technician-open-profile", onOpen);
    return () => window.removeEventListener("smart-campus-technician-open-profile", onOpen);
  }, []);

  useEffect(() => {
    if (!techChatPopupOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setTechChatPopupOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [techChatPopupOpen]);

  useEffect(() => {
    if (ticketDetailModalId) {
      setTechTimelineExpanded(true);
    }
  }, [ticketDetailModalId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setAssignedLoading(true);
      setAssignedError("");
      try {
        const data = await getTechnicianAssignedTickets();
        if (!cancelled) setAssignedTickets(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setAssignedError(e?.message || "Could not load assigned tickets.");
      } finally {
        if (!cancelled) setAssignedLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userRev]);

  useEffect(() => {
    if (!profileModalOpen) return;
    setPhoneDraft((techUser?.phoneNumber || "").trim());
    setSaveState({ busy: false, message: "", error: "" });
    setAvatarBusy(false);
    setAvatarRemoveBusy(false);
    setAvatarError("");
    setAvatarSuccess("");
  }, [profileModalOpen, techUser]);

  const handleAvailabilityChange = async (nextAvailable) => {
    setAvailabilityBusy(true);
    setAvailabilityError("");
    try {
      const updated = await updateTechnicianAvailability(nextAvailable);
      persistCampusUser(updated);
    } catch (e) {
      setAvailabilityError(e?.message || "Could not update availability.");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const renderDashboardAvailabilityRadioGroup = () => {
    const wrapStyle = { gridColumn: "1 / -1", marginTop: 4, paddingTop: 14, borderTop: "1px solid #F5E7C6" };
    const legendStyle = { fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: 8, padding: 0 };
    const labelStyle = {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontWeight: 600,
      fontSize: 13,
      color: "#222222",
      cursor: availabilityBusy ? "wait" : "pointer",
    };

    return (
      <fieldset style={{ border: "none", margin: 0, padding: 0, ...wrapStyle }}>
        <legend style={legendStyle}>Availability</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="radiogroup" aria-label="Technician availability">
          <label style={labelStyle}>
            <input
              type="radio"
              name="tech-dash-availability"
              checked={isTechnicianAvailable}
              onChange={() => handleAvailabilityChange(true)}
              disabled={availabilityBusy}
              style={{ width: 18, height: 18, accentColor: "#2e7d32", cursor: availabilityBusy ? "wait" : "pointer" }}
            />
            Available
          </label>
          <label style={labelStyle}>
            <input
              type="radio"
              name="tech-dash-availability"
              checked={!isTechnicianAvailable}
              onChange={() => handleAvailabilityChange(false)}
              disabled={availabilityBusy}
              style={{ width: 18, height: 18, accentColor: "#6b7280", cursor: availabilityBusy ? "wait" : "pointer" }}
            />
            Unavailable
          </label>
        </div>
        <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#6b7280", lineHeight: 1.45, maxWidth: 520 }}>
          Set whether you are available for new assignments. This is saved to your account.
        </p>
        {availabilityError && (
          <p style={{ margin: "8px 0 0 0", color: "#c62828", fontSize: "12px", fontWeight: 600 }}>{availabilityError}</p>
        )}
      </fieldset>
    );
  };

  const closeTicketDetailModal = () => {
    setTechChatPopupOpen(false);
    setTechTimelineExpanded(true);
    setTicketDetailModalId(null);
    setTicketDetailModalData(null);
    setTicketDetailModalError("");
    setTicketDetailModalLoading(false);
  };

  const loadTicketDetailsForModal = async (ticketId) => {
    if (!ticketId) return;
    setTicketDetailModalLoading(true);
    setTicketDetailModalError("");
    try {
      const data = await getTicketDetails(ticketId);
      setTicketDetailModalData(data);
    } catch (e) {
      setTicketDetailModalError(e?.message || "Failed to load ticket.");
      setTicketDetailModalData(null);
    } finally {
      setTicketDetailModalLoading(false);
    }
  };

  const openTicketDetailModal = (ticketId) => {
    if (!ticketId) return;
    setTicketDetailModalId(ticketId);
    loadTicketDetailsForModal(ticketId);
  };

  const handleTicketProgress = async (ticketId, nextStatus, options = {}) => {
    if (!ticketId) return;
    const opts = typeof options === "function" ? { onSuccess: options } : options;
    const { onSuccess, resolutionDetails } = opts;
    setProgressBusyId(ticketId);
    setAssignedError("");
    try {
      const res = await updateTechnicianTicketProgress(ticketId, nextStatus, resolutionDetails);
      const updated = res?.ticket;
      if (updated?.id) {
        setAssignedTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
        if (ticketDetailModalId === ticketId) {
          await loadTicketDetailsForModal(ticketId);
        }
        if (typeof onSuccess === "function") onSuccess(updated);
      }
    } catch (e) {
      setAssignedError(e?.message || "Could not update progress.");
    } finally {
      setProgressBusyId("");
    }
  };

  const openResolvePanel = (ticketId) => {
    setResolveFormError("");
    setResolvePanelTicketId(ticketId);
  };

  const cancelResolvePanel = () => {
    setResolvePanelTicketId(null);
    setResolveFormError("");
  };

  const confirmResolveTicket = async (ticketId) => {
    const text = (resolutionDraftByTicketId[ticketId] || "").trim();
    if (!text) {
      setResolveFormError("Please add resolution details before marking this ticket resolved.");
      return;
    }
    setResolveFormError("");
    await handleTicketProgress(ticketId, "RESOLVED", {
      resolutionDetails: text,
      onSuccess: () => {
        setResolvePanelTicketId(null);
        setResolutionDraftByTicketId((prev) => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
      },
    });
  };

  const serverPhone = (techUser?.phoneNumber || "").trim();
  const canSavePhone = useMemo(() => {
    const draft = phoneDraft.trim();
    if (!isValidPhone(draft)) return false;
    return draft !== serverPhone;
  }, [phoneDraft, serverPhone]);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            marginBottom: 20,
            padding: "16px 18px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #F5E7C6",
            borderLeft: "4px solid #FA8112",
            borderRadius: "12px",
            boxSizing: "border-box",
            boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
          }}
        >
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            <span style={{ fontSize: "clamp(17px, 2.1vw, 22px)", fontWeight: 800, color: "#14213D" }}>
              Welcome back, {name}.
            </span>
          </p>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>Availability:</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 800,
                backgroundColor: isTechnicianAvailable ? "#e8f5e9" : "#f3f4f6",
                color: isTechnicianAvailable ? "#2e7d32" : "#6b7280",
                border: `1px solid ${isTechnicianAvailable ? "#c8e6c9" : "#e5e7eb"}`,
                opacity: availabilityBusy ? 0.7 : 1,
              }}
            >
              {isTechnicianAvailable ? "Available" : "Unavailable"}
            </span>
            {availabilityBusy ? (
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>Saving…</span>
            ) : null}
          </div>
          {availabilityError ? (
            <p style={{ margin: "8px 0 0 0", color: "#c62828", fontSize: "12px", fontWeight: 600 }}>{availabilityError}</p>
          ) : null}
        </div>

        <div
          style={{
            flexShrink: 0,
            marginBottom: 0,
            border: "1px solid #F5E7C6",
            borderRadius: "12px",
            padding: "clamp(18px, 3vw, 24px)",
            backgroundColor: "#FFFFFF",
            boxSizing: "border-box",
            boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "clamp(16px, 3vw, 24px)",
              alignItems: "start",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "clamp(72px, 11vw, 88px)",
                height: "clamp(72px, 11vw, 88px)",
                borderRadius: "50%",
                backgroundColor: techUser?.profileImageUrl ? "#fff" : "#475569",
                border: "1px solid #F5E7C6",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {techUser?.profileImageUrl ? (
                <img src={techUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(20px, 4vw, 26px)" }}>{userDisplayInitial(techUser)}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                id="technician-personal-details"
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#14213D",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "14px",
                }}
              >
                Your personal details
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "14px 24px",
                  width: "100%",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Full name</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#222222", wordBreak: "break-word" }}>
                    {`${(techUser?.firstName || "").trim()} ${(techUser?.lastName || "").trim()}`.trim() || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Email</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#222222", wordBreak: "break-word" }}>{techUser?.email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Specialty</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#222222" }}>
                    {technicianSpecialtyText(techUser)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Phone</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#222222" }}>{(techUser?.phoneNumber || "").trim() || "—"}</div>
                </div>
                {renderDashboardAvailabilityRadioGroup()}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            marginTop: 20,
            border: "1px solid #F5E7C6",
            borderRadius: "12px",
            padding: "clamp(16px, 3vw, 22px)",
            backgroundColor: "#FFFFFF",
            boxSizing: "border-box",
            boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
          }}
        >
          <div
            id="technician-assigned-tickets"
            style={{ ...sectionTitleStyle, fontSize: "17px", color: "#14213D", marginBottom: "12px" }}
          >
            My assigned tickets
          </div>
          <p style={{ margin: "0 0 14px 0", color: "#6b7280", fontSize: "13px", lineHeight: 1.45 }}>
            Tickets the admin assigned to you. Updates sync to the reporter and admin dashboards.
          </p>
          {assignedLoading && <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Loading…</p>}
          {assignedError && <p style={{ margin: "0 0 10px 0", color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{assignedError}</p>}
          {!assignedLoading && !assignedError && assignedTickets.length === 0 && (
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>No assigned tickets yet.</p>
          )}
          {!assignedLoading && !assignedError && assignedTickets.length > 0 && (
            <div style={techTicketFilterBarStyle}>
              <select
                style={techTicketFilterSelectStyle}
                value={techTicketStatusFilter}
                onChange={(e) => setTechTicketStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                {TECH_TICKET_STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                style={techTicketFilterSelectStyle}
                value={techTicketPriorityFilter}
                onChange={(e) => setTechTicketPriorityFilter(e.target.value)}
                aria-label="Filter by priority"
              >
                {TECH_TICKET_PRIORITY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="search"
                style={techTicketFilterSearchStyle}
                value={techTicketSearch}
                onChange={(e) => setTechTicketSearch(e.target.value)}
                placeholder="Search title, reporter, location…"
                aria-label="Search assigned tickets"
              />
              {techTicketFiltersActive && (
                <button
                  type="button"
                  onClick={clearTechTicketFilters}
                  style={{
                    border: "2px solid #F5E7C6",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontWeight: 700,
                    fontFamily: techFontUi,
                    backgroundColor: "#FFFFFF",
                    color: "#14213D",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          {!assignedLoading && !assignedError && assignedTickets.length > 0 && (
            <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px", fontWeight: 600 }}>
              Showing {filteredAssignedTickets.length} of {assignedTickets.length} ticket{assignedTickets.length === 1 ? "" : "s"}
            </p>
          )}
          {!assignedLoading && !assignedError && assignedTickets.length > 0 && filteredAssignedTickets.length === 0 && (
            <p style={{ margin: "0 0 8px 0", color: "#374151", fontSize: "14px", fontWeight: 600 }}>
              No tickets match your filters.
            </p>
          )}
          {!assignedLoading && assignedTickets.length > 0 && filteredAssignedTickets.length > 0 && (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredAssignedTickets.map((t) => {
                const st = (t.status || "").toUpperCase();
                const busy = progressBusyId === t.id;
                return (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid #F5E7C6",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      backgroundColor: "#FAF3E1",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#14213D", fontSize: "15px", marginBottom: "6px" }}>{t.issueTitle || "Ticket"}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", lineHeight: 1.4 }}>
                      {t.category || "—"} · Priority {t.priority || "—"} · {assignedTicketStatusLabel(t.status)}
                    </div>
                    <div style={{ fontSize: "13px", color: "#374151", marginBottom: "10px" }}>
                      <span style={{ fontWeight: 700 }}>Reporter:</span> {t.fullName || "—"} · {t.email || "—"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#374151", marginBottom: "12px" }}>
                      <span style={{ fontWeight: 700 }}>Location:</span> {t.resourceLocation || "—"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        style={{
                          ...buttonStyle,
                          backgroundColor: "#14213D",
                          padding: "10px 14px",
                          fontSize: "13px",
                          opacity: busy ? 0.7 : 1,
                          cursor: busy ? "wait" : "pointer",
                        }}
                        disabled={busy}
                        onClick={() => openTicketDetailModal(t.id)}
                      >
                        View details
                      </button>
                      {st === "ACCEPTED" && (
                        <>
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              backgroundColor: "#FCA311",
                              padding: "10px 14px",
                              fontSize: "13px",
                              opacity: busy ? 0.7 : 1,
                              cursor: busy ? "wait" : "pointer",
                            }}
                            disabled={busy}
                            onClick={() => handleTicketProgress(t.id, "IN_PROGRESS")}
                          >
                            Start work
                          </button>
                          <button
                            type="button"
                            style={{
                              ...buttonStyle,
                              backgroundColor: "#2e7d32",
                              padding: "10px 14px",
                              fontSize: "13px",
                              opacity: busy ? 0.7 : 1,
                              cursor: busy ? "wait" : "pointer",
                            }}
                            disabled={busy}
                            onClick={() => openResolvePanel(t.id)}
                          >
                            Mark resolved
                          </button>
                        </>
                      )}
                      {st === "IN_PROGRESS" && (
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            backgroundColor: "#2e7d32",
                            padding: "10px 14px",
                            fontSize: "13px",
                            opacity: busy ? 0.7 : 1,
                            cursor: busy ? "wait" : "pointer",
                          }}
                          disabled={busy}
                          onClick={() => openResolvePanel(t.id)}
                        >
                          Mark resolved
                        </button>
                      )}
                      {st === "RESOLVED" && (
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#2e7d32" }}>Completed</span>
                      )}
                    </div>
                    {st === "RESOLVED" && (t.resolutionDetails || "").trim() && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid #c8e6c9",
                          backgroundColor: "#f1f8e9",
                          fontSize: "13px",
                          color: "#374151",
                          lineHeight: 1.45,
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#14213D" }}>Resolution: </span>
                        {t.resolutionDetails}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 12 }} aria-hidden />
      </div>

      {resolvePanelTicketId && (() => {
        const resolveTicket = assignedTickets.find((x) => x.id === resolvePanelTicketId);
        const resolveBusy = progressBusyId === resolvePanelTicketId;
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tech-resolve-modal-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1110,
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !resolveBusy) cancelResolvePanel();
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                backgroundColor: "#fff",
                borderRadius: 14,
                border: "1px solid #F5E7C6",
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
                <div id="tech-resolve-modal-title" style={{ fontSize: 16, fontWeight: 900, color: "#14213D" }}>
                  Mark resolved
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 4, lineHeight: 1.35 }}>
                  {resolveTicket?.issueTitle || "Ticket"}
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <label
                  htmlFor="tech-resolve-textarea"
                  style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#14213D", marginBottom: 8 }}
                >
                  Resolution details
                </label>
                <textarea
                  id="tech-resolve-textarea"
                  rows={4}
                  value={resolutionDraftByTicketId[resolvePanelTicketId] ?? ""}
                  onChange={(e) => {
                    setResolutionDraftByTicketId((prev) => ({ ...prev, [resolvePanelTicketId]: e.target.value }));
                    setResolveFormError("");
                  }}
                  placeholder="Describe what was fixed or verified…"
                  style={{
                    ...selectStyle,
                    width: "100%",
                    resize: "vertical",
                    minHeight: 88,
                    fontFamily: "inherit",
                    lineHeight: 1.45,
                  }}
                />
                {resolveFormError && (
                  <p style={{ margin: "8px 0 0 0", color: "#c62828", fontSize: "12px", fontWeight: 600 }}>{resolveFormError}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#fff",
                      color: "#14213D",
                      border: "1px solid #F5E7C6",
                      padding: "10px 14px",
                      fontSize: "13px",
                    }}
                    disabled={resolveBusy}
                    onClick={cancelResolvePanel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#2e7d32",
                      padding: "10px 14px",
                      fontSize: "13px",
                      opacity: resolveBusy ? 0.7 : 1,
                      cursor: resolveBusy ? "wait" : "pointer",
                    }}
                    disabled={resolveBusy}
                    onClick={() => confirmResolveTicket(resolvePanelTicketId)}
                  >
                    {resolveBusy ? "Saving…" : "Confirm resolution"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {profileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProfileModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              backgroundColor: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>My profile</div>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700, marginTop: 2 }}>Personal info</div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {techUser?.profileImageUrl ? (
                    <img
                      src={techUser.profileImageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 42, fontWeight: 900, color: "#6b7280" }}>{userDisplayInitial(techUser)}</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 280 }}>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setAvatarError("");
                      setAvatarSuccess("");
                      setAvatarBusy(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const updated = await uploadProfileAvatar(fd);
                        persistCampusUser(updated);
                        setAvatarSuccess("Profile photo updated.");
                      } catch (err) {
                        setAvatarError(err?.message || "Upload failed");
                      } finally {
                        setAvatarBusy(false);
                      }
                    }}
                  />

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={avatarBusy || avatarRemoveBusy}
                      onClick={() => avatarFileRef.current?.click()}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        fontWeight: 900,
                        fontSize: 14,
                        cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                        color: "#111827",
                      }}
                    >
                      {avatarBusy ? "Saving…" : techUser?.profileImageUrl ? "Change photo" : "Upload photo"}
                    </button>

                    {techUser?.profileImageUrl && (
                      <button
                        type="button"
                        disabled={avatarBusy || avatarRemoveBusy}
                        onClick={async () => {
                          const ok = window.confirm("Remove your profile photo from Smart Campus?");
                          if (!ok) return;
                          setAvatarError("");
                          setAvatarSuccess("");
                          setAvatarRemoveBusy(true);
                          try {
                            const updated = await removeProfileAvatar();
                            persistCampusUser(updated);
                            setAvatarSuccess("Profile photo removed.");
                          } catch (err) {
                            setAvatarError(err?.message || "Could not remove photo");
                          } finally {
                            setAvatarRemoveBusy(false);
                          }
                        }}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #fecaca",
                          background: "#ffffff",
                          fontWeight: 900,
                          fontSize: 14,
                          cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                          color: "#b91c1c",
                        }}
                      >
                        {avatarRemoveBusy ? "Removing…" : "Remove photo"}
                      </button>
                    )}
                  </div>

                  {avatarSuccess && <div style={{ marginTop: 10, color: "#059669", fontWeight: 800 }}>{avatarSuccess}</div>}
                  {avatarError && <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 800 }}>{avatarError}</div>}
                </div>
              </div>

              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={techUser?.email || ""}
                    readOnly
                    disabled
                    style={{ ...selectStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => {
                      setPhoneDraft(e.target.value);
                      setSaveState((s) => ({ ...s, message: "", error: "" }));
                    }}
                    style={selectStyle}
                    placeholder="+94 77 123 4567"
                    autoComplete="tel"
                  />
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontWeight: 700 }}>
                    7–20 characters: digits, spaces, +, -, ( )
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    First name
                  </label>
                  <input
                    type="text"
                    value={techUser?.firstName || ""}
                    readOnly
                    disabled
                    style={{ ...selectStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    type="text"
                    value={techUser?.lastName || ""}
                    readOnly
                    disabled
                    style={{ ...selectStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 14, alignItems: "center" }}>
                {saveState.message && <span style={{ color: "#059669", fontWeight: 900 }}>{saveState.message}</span>}
                {saveState.error && <span style={{ color: "#b91c1c", fontWeight: 900 }}>{saveState.error}</span>}

                <button
                  type="button"
                  disabled={!canSavePhone || saveState.busy}
                  onClick={async () => {
                    if (!canSavePhone) return;
                    setSaveState({ busy: true, message: "", error: "" });
                    try {
                      const updated = await updateProfilePhone({ phoneNumber: phoneDraft.trim() });
                      persistCampusUser(updated);
                      setSaveState({ busy: false, message: "Changes saved.", error: "" });
                    } catch (err) {
                      setSaveState({ busy: false, message: "", error: err?.message || "Save failed" });
                    }
                  }}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: canSavePhone && !saveState.busy ? "#FA8112" : "#d1d5db",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: canSavePhone && !saveState.busy ? "pointer" : "not-allowed",
                  }}
                >
                  {saveState.busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ticketDetailModalId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tech-ticket-detail-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeTicketDetailModal();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 640,
              maxHeight: "min(90vh, 720px)",
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div id="tech-ticket-detail-title" style={{ fontSize: 17, fontWeight: 900, color: "#14213D" }}>
                Ticket details
              </div>
              <button
                type="button"
                onClick={closeTicketDetailModal}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  color: "#14213D",
                }}
              >
                Close
              </button>
            </div>
            <div
              style={{
                padding: 16,
                overflowY: "auto",
                flex: 1,
                minHeight: 0,
                fontFamily: techFontUi,
              }}
            >
              {ticketDetailModalLoading && <p style={{ margin: 0, color: "#6b7280" }}>Loading ticket…</p>}
              {ticketDetailModalError && (
                <p style={{ margin: 0, color: "#d32f2f", fontWeight: 600 }}>{ticketDetailModalError}</p>
              )}
              {!ticketDetailModalLoading && !ticketDetailModalError && ticketDetailModalData?.ticket && (() => {
                const tk = ticketDetailModalData.ticket;
                const hasTechAssignment = Boolean((tk.assignedTechnicianId || "").trim());
                const comments = ticketDetailModalData.comments || [];
                const attachments = normalizeTicketAttachments(tk.attachments);
                const priorityBg =
                  tk.priority === "High" ? "#d32f2f" : tk.priority === "Medium" ? "#FCA311" : "#2e7d32";
                const chip = {
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                };
                return (
                  <>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#222", marginBottom: "12px" }}>
                      {tk.issueTitle || "Ticket"}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      <span style={{ ...chip, backgroundColor: "#14213D", color: "#fff" }}>Status: {tk.status}</span>
                      <span style={{ ...chip, backgroundColor: priorityBg, color: "#fff" }}>Priority: {tk.priority}</span>
                      <span style={{ ...chip, backgroundColor: "#E5E5E5", color: "#14213D" }}>Category: {tk.category}</span>
                    </div>
                    <p style={{ margin: "0 0 8px 0", color: "#374151", fontSize: "14px" }}>
                      <span style={{ fontWeight: 700 }}>Reporter:</span> {tk.fullName || "—"} · {tk.email || "—"} ·{" "}
                      {tk.phoneNumber || "—"}
                    </p>
                    <p style={{ margin: "0 0 12px 0", color: "#374151", fontSize: "14px" }}>
                      <span style={{ fontWeight: 700 }}>Location:</span> {tk.resourceLocation || "—"}
                    </p>
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #F5E7C6",
                        backgroundColor: "#FAF3E1",
                        color: "#374151",
                        fontSize: "14px",
                        lineHeight: 1.45,
                        marginBottom: 14,
                      }}
                    >
                      {tk.description || "—"}
                    </div>

                    <div style={{ ...sectionTitleStyle, color: "#14213D" }}>Attachments</div>
                    {attachments.length === 0 ? (
                      <p style={{ margin: "0 0 14px 0", color: "#6b7280", fontSize: "13px" }}>No attachments.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                        {attachments.map((path, idx) => (
                          <div
                            key={`${path}-${idx}`}
                            style={{
                              flex: "1 1 140px",
                              maxWidth: 200,
                              border: "1px solid #F5E7C6",
                              borderRadius: 10,
                              padding: 6,
                              backgroundColor: "#fff",
                            }}
                          >
                            <img
                              src={path}
                              alt=""
                              style={{
                                width: "100%",
                                height: 100,
                                objectFit: "contain",
                                borderRadius: 8,
                                backgroundColor: "#FAF3E1",
                                display: "block",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {(tk.status || "").toUpperCase() === "RESOLVED" && (tk.resolutionDetails || "").trim() && (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid #c8e6c9",
                          backgroundColor: "#f1f8e9",
                          color: "#374151",
                          fontSize: "14px",
                          lineHeight: 1.45,
                          marginBottom: 14,
                          fontFamily: techFontUi,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#14213D",
                            marginBottom: 6,
                            letterSpacing: "0.02em",
                          }}
                        >
                          Resolution details
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#374151", lineHeight: 1.5 }}>
                          {tk.resolutionDetails}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 4,
                        marginBottom: 14,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #F5E7C6",
                        backgroundColor: "#FFFFFF",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                        <div style={{ ...sectionTitleStyle, color: "#14213D", marginBottom: 6 }}>Messages</div>
                        <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", lineHeight: 1.45 }}>
                          Private WhatsApp-style chat with the ticket reporter. Open the window when you want to talk.
                        </p>
                        {!hasTechAssignment && (
                          <p style={{ margin: "10px 0 0 0", color: "#6b7280", fontSize: "13px" }}>
                            Chat is unavailable until this ticket has an assigned technician on file.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!hasTechAssignment}
                        onClick={() => setTechChatPopupOpen(true)}
                        style={{
                          flexShrink: 0,
                          backgroundColor: hasTechAssignment ? "#128C7E" : "#d1d5db",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 8,
                          padding: "12px 18px",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: hasTechAssignment ? "pointer" : "not-allowed",
                          display: "inline-flex",
                          gap: 8,
                          alignItems: "center",
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!hasTechAssignment) return;
                          e.currentTarget.style.backgroundColor = "#0f7a6e";
                        }}
                        onMouseLeave={(e) => {
                          if (!hasTechAssignment) return;
                          e.currentTarget.style.backgroundColor = "#128C7E";
                        }}
                      >
                        <span aria-hidden="true" style={{ fontSize: 16 }}>
                          💬
                        </span>
                        Open chat
                      </button>
                    </div>

                    <div style={{ ...techTimelinePanelStyle, marginTop: "14px" }}>
                      <button
                        type="button"
                        id={`tech-timeline-toggle-${tk.id}`}
                        aria-expanded={techTimelineExpanded}
                        aria-controls={`tech-timeline-body-${tk.id}`}
                        style={{
                          ...techTimelineHeaderButtonStyle,
                          borderBottom: techTimelineExpanded ? "1px solid #F5E7C6" : "none",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTechTimelineExpanded((prev) => !prev);
                        }}
                      >
                        <span>Timeline and service metrics</span>
                        <span
                          aria-hidden
                          style={{
                            fontSize: "11px",
                            color: "#14213D",
                            fontWeight: 800,
                            lineHeight: 1,
                            flexShrink: 0,
                            width: "22px",
                            height: "22px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "6px",
                            border: "1px solid #F5E7C6",
                            backgroundColor: "#FFFFFF",
                          }}
                          title={techTimelineExpanded ? "Collapse" : "Expand"}
                        >
                          {techTimelineExpanded ? "−" : "+"}
                        </span>
                      </button>

                      {techTimelineExpanded && (
                        <div id={`tech-timeline-body-${tk.id}`} role="region" aria-label="Timeline and service metrics">
                          <div style={{ ...techTimelineRowStyle, borderBottom: "1px solid #f0ebe0" }}>
                            <span style={techTimelineLabelStyle}>Ticket created at</span>
                            <span style={techTimelineValueStyle}>{formatTicketInstant(tk.createdAt)}</span>
                          </div>
                          <div style={{ ...techTimelineRowStyle, borderBottom: "1px solid #f0ebe0" }}>
                            <span style={techTimelineLabelStyle}>Technician assigned at</span>
                            <span style={techTimelineValueStyle}>{formatTicketInstant(tk.technicianAssignedAt)}</span>
                          </div>
                          <div style={{ ...techTimelineRowStyle, borderBottom: "none" }}>
                            <span style={techTimelineLabelStyle}>Ticket resolved at</span>
                            <span style={techTimelineValueStyle}>{formatTicketInstant(tk.resolvedAt)}</span>
                          </div>

                          <div
                            style={{
                              borderTop: "1px solid #F5E7C6",
                              backgroundColor: "#faf9f6",
                            }}
                          >
                            <div
                              style={{
                                ...techTimelineMetricsRowStyle,
                                borderBottom: "1px solid #f0ebe0",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontWeight: 700, color: "#14213D", fontSize: "13px" }}>TFR</span>
                                <span
                                  style={{
                                    display: "block",
                                    marginTop: "2px",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    color: "#9ca3af",
                                  }}
                                >
                                  Time to first response
                                </span>
                              </div>
                              <span style={{ ...techTimelineValueStyle, color: "#14213D", fontSize: "14px" }}>
                                {formatDurationSeconds(tk.timeToFirstResponseSeconds)}
                              </span>
                            </div>
                            <div style={{ ...techTimelineMetricsRowStyle, backgroundColor: "#faf9f6" }}>
                              <div style={{ minWidth: 0 }}>
                                <span style={{ fontWeight: 700, color: "#14213D", fontSize: "13px" }}>TTR</span>
                                <span
                                  style={{
                                    display: "block",
                                    marginTop: "2px",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    color: "#9ca3af",
                                  }}
                                >
                                  Time to resolution
                                </span>
                              </div>
                              <span style={{ ...techTimelineValueStyle, color: "#14213D", fontSize: "14px" }}>
                                {formatDurationSeconds(tk.timeToResolutionSeconds)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ ...sectionTitleStyle, color: "#14213D" }}>Comments</div>
                    {comments.length === 0 ? (
                      <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px" }}>No comments yet.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                        {comments.map((c) => (
                          <div
                            key={c.id}
                            style={{
                              border: "1px solid #F5E7C6",
                              borderRadius: 12,
                              padding: "12px",
                              backgroundColor: "#FAF3E1",
                            }}
                          >
                            <div style={{ fontWeight: 800, color: "#14213D", fontSize: "14px" }}>{c.createdBy}</div>
                            <div style={{ marginTop: 6, color: "#374151", fontSize: "14px", lineHeight: 1.45 }}>{c.content}</div>
                            <div style={{ marginTop: 6, color: "#6b7280", fontSize: "12px" }}>{formatModalDate(c.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {techChatPopupOpen && ticketDetailModalId && ticketDetailModalData?.ticket && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tech-ticket-chat-popup-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1500,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTechChatPopupOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "min(92vh, 560px)",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.22)",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "12px 14px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#FAF3E1",
              }}
            >
              <div id="tech-ticket-chat-popup-title" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#14213D", lineHeight: 1.2 }}>Ticket messages</div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginTop: 2 }}>
                  {ticketDetailModalData.ticket.fullName || ticketDetailModalData.ticket.email || "Reporter"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTechChatPopupOpen(false)}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#FFFFFF",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#14213D",
                  flexShrink: 0,
                }}
              >
                Close
              </button>
            </div>
            <div style={{ padding: 10, flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
              <TicketTechnicianChat
                ticketId={ticketDetailModalId}
                viewerRole="TECHNICIAN"
                peerName={ticketDetailModalData.ticket.fullName || ticketDetailModalData.ticket.email || "Reporter"}
                hasAssignment={Boolean((ticketDetailModalData.ticket.assignedTechnicianId || "").trim())}
                height={380}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdminTechnicianForm() {
  const navigate = useNavigate();
  const [techFirstName, setTechFirstName] = useState("");
  const [techLastName, setTechLastName] = useState("");
  const [techEmail, setTechEmail] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [techCategory, setTechCategory] = useState(DEFAULT_TECHNICIAN_CATEGORY);
  const [techPassword, setTechPassword] = useState("");
  const [techSubmitting, setTechSubmitting] = useState(false);
  const [techMessage, setTechMessage] = useState("");
  const [techError, setTechError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [techListLoading, setTechListLoading] = useState(true);
  const [techListError, setTechListError] = useState("");

  const loadTechnicianRoster = async () => {
    setTechListLoading(true);
    setTechListError("");
    try {
      const data = await listTechnicians();
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (err) {
      setTechListError(err?.message || "Could not load technicians.");
      setTechnicians([]);
    } finally {
      setTechListLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicianRoster();
  }, []);

  const submitAddTechnician = async (e) => {
    e.preventDefault();
    setTechMessage("");
    setTechError("");
    setTechSubmitting(true);
    try {
      await createTechnician({
        firstName: techFirstName.trim(),
        lastName: techLastName.trim(),
        email: techEmail.trim(),
        phoneNumber: techPhone.trim(),
        password: techPassword,
        category: toApiTechnicianCategory(techCategory),
      });
      setTechMessage("Technician created. They can sign in with email and password.");
      setTechFirstName("");
      setTechLastName("");
      setTechEmail("");
      setTechPhone("");
      setTechCategory(DEFAULT_TECHNICIAN_CATEGORY);
      setTechPassword("");
      loadTechnicianRoster();
    } catch (err) {
      setTechError(err?.message || "Could not create technician.");
    } finally {
      setTechSubmitting(false);
    }
  };

  return (
    <>
      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "12px",
          backgroundColor: "#FAF3E1",
          marginBottom: "18px",
        }}
      >
        <div style={{ color: "#222222", fontSize: "22px", fontWeight: 800, lineHeight: 1.1 }}>Welcome back, Admin</div>
        <div style={{ color: "#6b7280", fontSize: "13px", fontWeight: 600, marginTop: "6px" }}>
          Ticket analytics dashboard with live operational metrics
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/adminticket")}
        style={{
          marginBottom: "16px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #F5E7C6",
          backgroundColor: "#FFFFFF",
          color: "#14213D",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        ← Back to Admin Ticket Dashboard
      </button>

      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "14px",
          backgroundColor: "#FFFFFF",
          marginBottom: "16px",
        }}
      >
        <div style={sectionTitleStyle}>Technician roster</div>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>
          Personal details for each registered technician.
        </p>
        {techListLoading && <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>Loading technicians…</p>}
        {techListError && !techListLoading && (
          <p style={{ margin: 0, color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{techListError}</p>
        )}
        {!techListLoading && !techListError && technicians.length === 0 && (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>No technicians yet. Add one below.</p>
        )}
        {!techListLoading && technicians.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}
          >
            {technicians.map((t) => (
              <div
                key={t.id || t.email}
                style={{
                  border: "1px solid #F5E7C6",
                  borderRadius: "12px",
                  padding: "14px",
                  backgroundColor: "#FAF3E1",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "12px",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    backgroundColor: t.profileImageUrl ? "#fff" : "#475569",
                    border: "1px solid #F5E7C6",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {t.profileImageUrl ? (
                    <img src={t.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{userDisplayInitial(t)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#222222", lineHeight: 1.25 }}>
                    {`${(t.firstName || "").trim()} ${(t.lastName || "").trim()}`.trim() || "Technician"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginTop: "6px", wordBreak: "break-word" }}>
                    {t.email || "—"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>
                    Phone: {(t.phoneNumber || "").trim() || "—"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#14213D", marginTop: "6px" }}>
                    Specialty: {technicianSpecialtyText(t)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "14px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div style={sectionTitleStyle}>Technicians</div>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>
          Create staff accounts. Technicians sign in with email and password on the main Sign In page.
        </p>
        <form onSubmit={submitAddTechnician} style={{ display: "grid", gap: "10px", maxWidth: "480px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input
              required
              placeholder="First name"
              value={techFirstName}
              onChange={(e) => setTechFirstName(e.target.value)}
              style={selectStyle}
            />
            <input
              required
              placeholder="Last name"
              value={techLastName}
              onChange={(e) => setTechLastName(e.target.value)}
              style={selectStyle}
            />
          </div>
          <input
            required
            type="email"
            placeholder="Work email"
            value={techEmail}
            onChange={(e) => setTechEmail(e.target.value)}
            style={selectStyle}
          />
          <input
            placeholder="Phone (optional)"
            value={techPhone}
            onChange={(e) => setTechPhone(e.target.value)}
            style={selectStyle}
          />
          <select
            required
            value={techCategory}
            onChange={(e) => setTechCategory(e.target.value)}
            style={selectStyle}
            aria-label="Technician category"
          >
            {TECHNICIAN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <PasswordInput
            required
            minLength={6}
            placeholder="Initial password (min 6 characters)"
            value={techPassword}
            onChange={(e) => setTechPassword(e.target.value)}
            style={selectStyle}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={techSubmitting}
            style={{ ...buttonStyle, opacity: techSubmitting ? 0.85 : 1, width: "fit-content" }}
          >
            {techSubmitting ? "Saving…" : "Add technician"}
          </button>
        </form>
        {techMessage ? (
          <p style={{ margin: "10px 0 0 0", color: "#2e7d32", fontSize: "13px", fontWeight: 600 }}>{techMessage}</p>
        ) : null}
        {techError ? <p style={{ margin: "10px 0 0 0", color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{techError}</p> : null}
      </div>
    </>
  );
}

export default function TechnicianDashboard() {
  const user = useMemo(() => getStoredUser(), []);
  const isTechnician = (user?.role || "").toUpperCase() === "TECHNICIAN";

  if (isTechnician) {
    return (
      <TechnicianAppShell>
        <section style={technicianCardStyle}>
          <TechnicianWorkspace />
        </section>
      </TechnicianAppShell>
    );
  }

  return (
    <div style={{ ...pageStyleBase, justifyContent: "flex-start" }}>
      <section style={{ ...containerStyle, maxWidth: "980px", margin: "0 auto" }}>
        <AdminTechnicianForm />
      </section>
    </div>
  );
}
