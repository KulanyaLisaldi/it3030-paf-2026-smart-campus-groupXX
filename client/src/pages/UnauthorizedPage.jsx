import React from "react";
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 20 }}>
      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 24, maxWidth: 520, width: "100%", textAlign: "center", boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}>
        <h1 style={{ margin: "0 0 8px", color: "#14213D", fontSize: 26 }}>Unauthorized</h1>
        <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14 }}>
          You do not have permission to access this page.
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          style={{ border: "none", background: "#FA8112", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}
        >
          Go Home
        </button>
      </section>
    </main>
  );
}
