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
  maxWidth: "1100px",
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  padding: "18px",
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
  fontSize: "24px",
  fontWeight: 700,
  letterSpacing: "-0.2px",
  color: "#222222",
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

const cardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#FFFFFF",
  marginBottom: "14px",
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
  minWidth: "180px",
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
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("DATE_DESC");

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

  const toggleOpen = (ticketId) => {
    setOpenTicketIds((prev) => ({ ...prev, [ticketId]: !prev[ticketId] }));
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

  return (
    <div style={pageStyle}>
      <section style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Admin Dashboard</h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ ...chipBaseStyle, backgroundColor: "#14213D", color: "#FFFFFF" }}>
              Total Tickets: {filteredAndSortedTickets.length}
            </span>
          </div>
        </div>

        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            border: "1px solid #F5E7C6",
            borderRadius: "10px",
            backgroundColor: "#FAF3E1",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
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
                  <div style={{ border: "1px solid #F5E7C6", borderRadius: "10px", padding: "10px", backgroundColor: "#FAF3E1" }}>
                    <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700 }}>Reported By</div>
                    <div style={{ color: "#222222", fontSize: "14px", fontWeight: 700 }}>{ticket.fullName || "N/A"}</div>
                    <div style={{ color: "#374151", fontSize: "13px", marginTop: "4px" }}>{ticket.email || "N/A"}</div>
                    <div style={{ color: "#374151", fontSize: "13px", marginTop: "2px" }}>{ticket.phoneNumber || "N/A"}</div>
                  </div>
                </div>

                <div style={{ marginTop: "10px", border: "1px solid #F5E7C6", borderRadius: "10px", padding: "10px", backgroundColor: "#FAF3E1" }}>
                  <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700 }}>Description</div>
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
      </section>
    </div>
  );
}

