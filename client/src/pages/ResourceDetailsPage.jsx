import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { getResourceById } from "../api/resources";

const wrapStyle = { maxWidth: 900, margin: "0 auto", padding: "28px 20px 40px", boxSizing: "border-box" };
const cardStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.06)" };

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function ResourceDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resource, setResource] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getResourceById(id);
        setResource(data && typeof data === "object" ? data : null);
      } catch (e) {
        setResource(null);
        setError(e?.message || "Could not load resource.");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const onBookNow = () => {
    if (!getAuthToken()) {
      navigate("/signin");
      return;
    }
    navigate(`/book-resource?resourceId=${encodeURIComponent(id || "")}`);
  };

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={wrapStyle}>
        <button type="button" onClick={() => navigate("/resources")} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: "pointer" }}>
          Back to Resources
        </button>

        <div style={{ ...cardStyle, marginTop: 12 }}>
          {loading && <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>Loading resource details...</p>}
          {!loading && error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

          {!loading && !error && resource && (
            <>
              <h1 style={{ margin: "0 0 4px", fontSize: 28, color: "#0f172a" }}>{resource.name || resource.resourceName || "—"}</h1>
              <p style={{ margin: "0 0 14px", color: "#64748b", fontWeight: 700 }}>{resource.code || resource.resourceCode || "—"}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, color: "#334155", fontSize: 14 }}>
                <div><strong>Type:</strong> {resource.type || "—"}</div>
                <div><strong>Capacity:</strong> {resource.capacity ?? "—"}</div>
                <div><strong>Location:</strong> {resource.location || "—"}</div>
                <div><strong>Status:</strong> {resource.status || "—"}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Description:</strong> {resource.description || "—"}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>Availability:</strong> {resource.availability || resource.availabilityText || "—"}</div>
                <div><strong>Created:</strong> {fmtDate(resource.createdAt)}</div>
                <div><strong>Updated:</strong> {fmtDate(resource.updatedAt)}</div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button type="button" onClick={onBookNow} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#FA8112", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                  Book Now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
