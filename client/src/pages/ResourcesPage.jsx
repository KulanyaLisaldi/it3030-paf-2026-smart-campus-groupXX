import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getResources } from "../api/resources";
import { getAuthToken } from "../api/http";

const pageStyle = { maxWidth: 1240, margin: "0 auto", padding: "30px 20px 44px", boxSizing: "border-box" };
const panelStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  padding: 16,
};
const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid #dbe4ee",
  boxSizing: "border-box",
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
};
const cardGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16, marginTop: 16 };
const cardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column",
  minHeight: 240,
};

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  const active = s === "ACTIVE";
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: active ? "1px solid #86efac" : "1px solid #fecaca",
    background: active ? "#f0fdf4" : "#fef2f2",
    color: active ? "#166534" : "#991b1b",
    fontSize: 11,
    fontWeight: 900,
  };
}

function normalizeResources(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.resources)) return payload.resources;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [minCapacity, setMinCapacity] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getResources({
          type: typeFilter,
          status: statusFilter,
          minCapacity: minCapacity === "" ? undefined : Number(minCapacity),
          location,
        });
        setResources(normalizeResources(data));
      } catch (e) {
        setResources([]);
        setError(e?.message || "Could not load resources.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [typeFilter, statusFilter, minCapacity, location]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (!q) return true;
      const hay = `${r.name || ""} ${r.resourceName || ""} ${r.code || ""} ${r.resourceCode || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resources, search]);

  const handleBook = (resource) => {
    if (!getAuthToken()) {
      navigate("/signin");
      return;
    }
    navigate(`/book-resource?resourceId=${encodeURIComponent(resource.id || "")}`);
  };

  return (
    <main style={{ flex: 1, background: "#f8fafc" }}>
      <div style={pageStyle}>
        <h1 style={{ margin: 0, color: "#14213D", fontSize: 30, fontWeight: 900 }}>Resources</h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, maxWidth: 700 }}>
          Discover campus facilities and assets. Search and filter resources, then view details or book.
        </p>

        <div style={{ ...panelStyle, marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <input style={{ ...inputStyle, gridColumn: "span 2" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by resource name or code" />
            <select style={inputStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="LECTURE_HALL">Lecture Hall</option>
              <option value="LAB">Lab</option>
              <option value="MEETING_ROOM">Meeting Room</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
            <input style={inputStyle} value={minCapacity} onChange={(e) => setMinCapacity(e.target.value.replace(/[^\d]/g, ""))} placeholder="Capacity >=" />
            <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
            </select>
            <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Filter by location" />
          </div>
        </div>

        {loading && <p style={{ color: "#64748b", fontWeight: 700 }}>Loading resources...</p>}
        {!loading && error && <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

        {!loading && (
          <div style={cardGridStyle}>
            {filtered.length === 0 && (
              <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>No resources found.</div>
            )}
            {filtered.map((r) => (
              <article key={r.id || r.code} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 900 }}>{r.name || r.resourceName || "—"}</h3>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12, fontWeight: 700 }}>{r.code || r.resourceCode || "—"}</p>
                  </div>
                  <span style={statusBadge(r.status)}>{r.status || "—"}</span>
                </div>

                <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#334155", marginTop: 12 }}>
                  <div><strong>Type:</strong> {r.type || "—"}</div>
                  <div><strong>Capacity:</strong> {r.capacity ?? "—"}</div>
                  <div><strong>Location:</strong> {r.location || "—"}</div>
                  <div><strong>Availability:</strong> {r.availability || r.availabilityText || "—"}</div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 14 }}>
                  <button
                    type="button"
                    style={{ flex: 1, height: 42, padding: "0 12px", borderRadius: 10, border: "1px solid #dbe4ee", background: "#fff", fontWeight: 800, cursor: "pointer", color: "#0f172a" }}
                    onClick={() => navigate(`/resources/${encodeURIComponent(r.id || "")}`)}
                    disabled={!r.id}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, height: 42, padding: "0 12px", borderRadius: 10, border: "none", background: "#FA8112", color: "#fff", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 20px rgba(250,129,18,0.28)" }}
                    onClick={() => handleBook(r)}
                  >
                    Book Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
