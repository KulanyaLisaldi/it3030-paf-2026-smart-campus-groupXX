import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMyTickets } from "../api/tickets";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#222222" }}>My Tickets</h1>
          <button
            type="button"
            style={{
              backgroundColor: "#FA8112",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
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
          <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
            {tickets.map((ticket) => (
              <article
                key={ticket.id}
                style={{
                  border: "1px solid #F5E7C6",
                  borderRadius: "10px",
                  padding: "14px",
                }}
              >
                <h3 style={{ margin: "0 0 8px 0", color: "#222222" }}>{ticket.issueTitle}</h3>
                <p style={{ margin: "4px 0" }}>
                  <strong>Status:</strong> {ticket.status}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Category:</strong> {ticket.category}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Priority:</strong> {ticket.priority}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Location:</strong> {ticket.resourceLocation}
                </p>
                <p style={{ margin: "8px 0 0 0", color: "#444444" }}>{ticket.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
