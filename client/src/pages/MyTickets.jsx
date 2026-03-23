import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyTickets } from "../api/tickets";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(180deg, #FAF3E1 0%, #FFFFFF 70%)",
  padding: "28px 16px",
  display: "flex",
  justifyContent: "center",
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

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("smartCampusUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function MyTickets() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useMemo(() => getCurrentUser(), []);
  const createdBy = user?.id || user?.email || "";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleButtonHover = (event, isHover) => {
    event.target.style.backgroundColor = isHover ? "#E66A0A" : "#FA8112";
  };

  useEffect(() => {
    const load = async () => {
      if (!createdBy) {
        setLoading(false);
        setError("Please sign in to view your tickets.");
        return;
      }

      try {
        setLoading(true);
        const data = await getMyTickets(createdBy);
        setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load tickets.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [createdBy]);

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
              cursor: "pointer",
              boxShadow: "0 10px 20px rgba(250, 129, 18, 0.22)",
            }}
            onMouseEnter={(event) => handleButtonHover(event, true)}
            onMouseLeave={(event) => handleButtonHover(event, false)}
            onClick={() => navigate("/tickets/create")}
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

                <p style={{ margin: "10px 0 0 0", color: "#374151", fontSize: "14px", fontWeight: 600 }}>
                  Location: <span style={{ fontWeight: 500 }}>{ticket.resourceLocation}</span>
                </p>

                <div style={{ ...descriptionBoxStyle, fontSize: "14px", fontWeight: 400 }}>{ticket.description}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
