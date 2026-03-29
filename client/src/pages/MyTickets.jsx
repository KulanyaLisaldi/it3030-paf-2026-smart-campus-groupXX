import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyTickets } from "../api/tickets";
import { getAuthToken } from "../api/http";
import { CREATE_TICKET_PATH, rememberPostLoginPath } from "../utils/authRedirect";
import { formatDurationSeconds, formatTicketInstant } from "../utils/slaFormat";
import { appFontFamily } from "../utils/appFont";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(180deg, #FAF3E1 0%, #FFFFFF 70%)",
  padding: "28px 16px",
  display: "flex",
  justifyContent: "center",
  fontFamily: appFontFamily,
};

const cardStyle = {
  width: "100%",
  maxWidth: "960px",
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  padding: "24px",
};

const headerStripStyle = {
  backgroundColor: "#FAF3E1",
  color: "#222222",
  borderRadius: "12px",
  padding: "16px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
  border: "1px solid #F5E7C6",
};

const titleStyle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  letterSpacing: "-0.2px",
  color: "#222222",
};

const chipBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const metaRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
};

const ticketCardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 10px 24px rgba(20, 33, 61, 0.06)",
};

const descriptionBoxStyle = {
  marginTop: "12px",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #F5E7C6",
  backgroundColor: "#FAF3E1",
  color: "#374151",
  lineHeight: 1.45,
};

const timelinePanelStyle = {
  marginTop: "16px",
  borderRadius: "12px",
  border: "1px solid #F5E7C6",
  backgroundColor: "#FFFFFF",
  overflow: "hidden",
  fontFamily: appFontFamily,
};

const timelineHeaderBarStyle = {
  padding: "11px 16px",
  backgroundColor: "#FAF3E1",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#14213D",
};

const timelineHeaderButtonStyle = {
  ...timelineHeaderBarStyle,
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

const timelineRowStyle = {
  display: "grid",
  /** Label may wrap; value column stays one line (dates, durations). */
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  gap: "8px 16px",
  alignItems: "center",
  padding: "10px 16px",
  fontSize: "13px",
  borderBottom: "1px solid #f0ebe0",
};

const timelineLabelStyle = {
  color: "#6b7280",
  fontWeight: 600,
  lineHeight: 1.4,
  minWidth: 0,
};

const timelineValueStyle = {
  color: "#374151",
  fontWeight: 600,
  textAlign: "right",
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  justifySelf: "end",
};

const timelineMetricsRowStyle = {
  ...timelineRowStyle,
  backgroundColor: "#faf9f6",
  borderBottom: "none",
};

function getProgressInfo(status) {
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
    return { percent: 20, label: "Submitted, waiting for admin action", color: "#14213D" };
  }
  return { percent: 10, label: normalizedStatus || "Pending", color: "#14213D" };
}

const getAdminDecisionMap = () => {
  try {
    const raw = localStorage.getItem("adminTicketDecisions");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export default function MyTickets() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** ticket id → false means collapsed; missing/undefined means expanded */
  const [timelineExpandedById, setTimelineExpandedById] = useState({});

  const handleButtonHover = (event, isHover) => {
    event.target.style.backgroundColor = isHover ? "#E66A0A" : "#FA8112";
  };

  useEffect(() => {
    const load = async () => {
      if (!getAuthToken()) {
        setLoading(false);
        setError("Please sign in to view your tickets.");
        return;
      }

      try {
        setLoading(true);
        const data = await getMyTickets();
        const decisions = getAdminDecisionMap();
        const list = Array.isArray(data) ? data : [];
        const merged = list.map((ticket) => {
          const decision = decisions[ticket?.id];
          if (!decision?.status || (decision.status || "").toUpperCase() !== "REJECTED") return ticket;
          return {
            ...ticket,
            status: decision.status,
            rejectionReason: decision.rejectionReason || "",
          };
        });
        setTickets(merged);
      } catch (err) {
        setError(err.message || "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div style={pageStyle}>
      <section style={cardStyle}>
        <div style={headerStripStyle}>
          <h1 style={titleStyle}>My Tickets</h1>

          <button
            type="button"
            style={{
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
            }}
            onMouseEnter={(event) => handleButtonHover(event, true)}
            onMouseLeave={(event) => handleButtonHover(event, false)}
            onClick={() => {
              if (!getAuthToken()) {
                rememberPostLoginPath(CREATE_TICKET_PATH);
                navigate("/signin", { state: { from: CREATE_TICKET_PATH } });
              } else {
                navigate(CREATE_TICKET_PATH);
              }
            }}
          >
            Create New Ticket
          </button>
        </div>

        {location.state?.createdSuccess && (
          <p style={{ color: "#2e7d32", marginTop: "10px", marginBottom: "8px" }}>
            Ticket submitted successfully.
          </p>
        )}

        {loading && <p>Loading tickets...</p>}
        {!loading && error && <p style={{ color: "#d32f2f" }}>{error}</p>}
        {!loading && !error && tickets.length === 0 && <p>No tickets found yet.</p>}

        {!loading && !error && tickets.length > 0 && (
          <div style={{ display: "grid", gap: "12px", marginTop: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            {tickets.map((ticket) => (
              (() => {
                const progress = getProgressInfo(ticket.status);
                const timelineExpanded = timelineExpandedById[ticket.id] !== false;
                return (
                  <article
                    key={ticket.id}
                    style={{ ...ticketCardStyle, cursor: "pointer" }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <div style={metaRowStyle}>
                      <span
                        style={{
                          ...chipBaseStyle,
                          backgroundColor: "#14213D",
                          color: "#FFFFFF",
                        }}
                      >
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

                      <span
                        style={{
                          ...chipBaseStyle,
                          backgroundColor: "#E5E5E5",
                          color: "#14213D",
                        }}
                      >
                        Category: {ticket.category}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 6px 0", color: "#222222", fontSize: "16px", fontWeight: 700 }}>
                      {ticket.issueTitle}
                    </h3>

                    {ticket.assignedTechnicianName && (
                      <p style={{ margin: "8px 0 0 0", color: "#14213D", fontSize: "13px", fontWeight: 700 }}>
                        Assigned technician: <span style={{ fontWeight: 600 }}>{ticket.assignedTechnicianName}</span>
                      </p>
                    )}

                    <div style={{ marginTop: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                        <div style={{ color: "#374151", fontWeight: 600, fontSize: "14px" }}>Progress: {progress.percent}%</div>
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

                    <p style={{ margin: "10px 0 0 0", color: "#374151", fontSize: "14px", fontWeight: 600 }}>
                      Location: <span style={{ fontWeight: 500 }}>{ticket.resourceLocation}</span>
                    </p>

                    <div style={{ ...descriptionBoxStyle, fontSize: "14px", fontWeight: 400 }}>{ticket.description}</div>
                    {(ticket.status || "").toUpperCase() === "RESOLVED" && (ticket.resolutionDetails || "").trim() && (
                      <div
                        style={{
                          ...descriptionBoxStyle,
                          marginTop: "8px",
                          border: "1px solid #c8e6c9",
                          backgroundColor: "#f1f8e9",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#374151",
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#14213D" }}>Resolution: </span>
                        {ticket.resolutionDetails}
                      </div>
                    )}
                    {(ticket.status || "").toUpperCase() === "REJECTED" && ticket.rejectionReason && (
                      <div style={{ ...descriptionBoxStyle, marginTop: "8px", color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>
                        Rejection Reason: {ticket.rejectionReason}
                      </div>
                    )}

                    <div onClick={(e) => e.stopPropagation()} style={timelinePanelStyle}>
                      <button
                        type="button"
                        id={`timeline-toggle-${ticket.id}`}
                        aria-expanded={timelineExpanded}
                        aria-controls={`timeline-body-${ticket.id}`}
                        style={{
                          ...timelineHeaderButtonStyle,
                          borderBottom: timelineExpanded ? "1px solid #F5E7C6" : "none",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineExpandedById((prev) => ({
                            ...prev,
                            [ticket.id]: !(prev[ticket.id] !== false),
                          }));
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
                          title={timelineExpanded ? "Collapse" : "Expand"}
                        >
                          {timelineExpanded ? "−" : "+"}
                        </span>
                      </button>

                      {timelineExpanded && (
                        <div id={`timeline-body-${ticket.id}`} role="region" aria-label="Timeline and service metrics">
                          <div style={{ ...timelineRowStyle, borderBottom: "1px solid #f0ebe0" }}>
                            <span style={timelineLabelStyle}>Ticket created at</span>
                            <span style={timelineValueStyle}>{formatTicketInstant(ticket.createdAt)}</span>
                          </div>
                          <div style={{ ...timelineRowStyle, borderBottom: "1px solid #f0ebe0" }}>
                            <span style={timelineLabelStyle}>Technician assigned at</span>
                            <span style={timelineValueStyle}>{formatTicketInstant(ticket.technicianAssignedAt)}</span>
                          </div>
                          <div style={{ ...timelineRowStyle, borderBottom: "none" }}>
                            <span style={timelineLabelStyle}>Ticket resolved at</span>
                            <span style={timelineValueStyle}>{formatTicketInstant(ticket.resolvedAt)}</span>
                          </div>

                          <div
                            style={{
                              borderTop: "1px solid #F5E7C6",
                              backgroundColor: "#faf9f6",
                            }}
                          >
                            <div
                              style={{
                                ...timelineMetricsRowStyle,
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
                              <span style={{ ...timelineValueStyle, color: "#14213D", fontSize: "14px" }}>
                                {formatDurationSeconds(ticket.timeToFirstResponseSeconds)}
                              </span>
                            </div>
                            <div style={{ ...timelineMetricsRowStyle, backgroundColor: "#faf9f6" }}>
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
                              <span style={{ ...timelineValueStyle, color: "#14213D", fontSize: "14px" }}>
                                {formatDurationSeconds(ticket.timeToResolutionSeconds)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })()
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
