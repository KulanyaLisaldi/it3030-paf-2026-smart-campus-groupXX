import React from "react";
import { useNavigate } from "react-router-dom";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  padding: "28px 16px",
  display: "flex",
  justifyContent: "center",
};

const containerStyle = {
  width: "100%",
  maxWidth: "720px",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.08)",
  padding: "28px",
};

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const raw = localStorage.getItem("smartCampusUser");
  let name = "Technician";
  try {
    const u = raw ? JSON.parse(raw) : null;
    if (u?.firstName) name = u.firstName;
  } catch {
    /* ignore */
  }

  const handleLogout = () => {
    localStorage.removeItem("smartCampusUser");
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/signin", { replace: true });
  };

  return (
    <div style={pageStyle}>
      <section style={containerStyle}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 800, color: "#222222" }}>
          Technician workspace
        </h1>
        <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>
          Welcome back, {name}. Ticket assignment and maintenance workflows can plug in here.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#222222",
            color: "#FFFFFF",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </section>
    </div>
  );
}
