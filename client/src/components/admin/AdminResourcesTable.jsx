import React, { useCallback, useEffect, useMemo, useState } from "react";
import { disableResource, getAdminResources, updateResourceStatus } from "../../api/adminResources";

const pageCardStyle = {
  maxWidth: "100%",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
  padding: "18px",
  boxSizing: "border-box",
};
const tableStyle = { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" };
const thStyle = { textAlign: "left", padding: "10px", fontWeight: 900, color: "#0f172a", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px", borderBottom: "1px solid #eef2f7", color: "#334155", verticalAlign: "top" };
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  outline: "none",
  color: "#0f172a",
  boxSizing: "border-box",
};

const smallBtnStyle = (variant = "neutral") => {
  const base = {
    padding: "8px 10px",
    borderRadius: "10px",
    border: "1px solid transparent",
    fontWeight: 800,
    fontSize: "12px",
    cursor: "pointer",
    background: "#fff",
  };
  if (variant === "danger") return { ...base, border: "1px solid #fecaca", color: "#b91c1c" };
  if (variant === "primary") return { ...base, border: "1px solid rgba(250,129,18,0.35)", color: "#9a3412", background: "rgba(250,129,18,0.10)" };
  return { ...base, border: "1px solid #e5e7eb", color: "#0f172a" };
};

const mockResources = [
  {
    id: "RES-001",
    code: "LH-A-101",
    name: "Main Lecture Hall A101",
    type: "LECTURE_HALL",
    capacity: 180,
    location: "Academic Block A - Floor 1",
    status: "ACTIVE",
    availability: "Mon-Fri 08:00-18:00",
  },
  {
    id: "RES-002",
    code: "LAB-C-204",
    name: "Computer Lab C204",
    type: "LAB",
    capacity: 40,
    location: "Engineering Block C - Floor 2",
    status: "ACTIVE",
    availability: "Mon-Sat 09:00-17:00",
  },
  {
    id: "RES-003",
    code: "EQ-PROJ-12",
    name: "Projector Unit 12",
    type: "EQUIPMENT",
    capacity: 1,
    location: "Media Store - Ground Floor",
    status: "OUT_OF_SERVICE",
    availability: "On request",
  },
];

function statusPill(status) {
  const isActive = status === "ACTIVE";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
    border: isActive ? "1px solid #86efac" : "1px solid #fecaca",
    background: isActive ? "#f0fdf4" : "#fef2f2",
    color: isActive ? "#166534" : "#991b1b",
  };
}

function normalizeResources(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.resources)) return payload.resources;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export default function AdminResourcesTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState([]);
  const [usingMockData, setUsingMockData] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [minCapacityFilter, setMinCapacityFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminResources({
        type: typeFilter,
        status: statusFilter,
        minCapacity: minCapacityFilter === "" ? undefined : Number(minCapacityFilter),
        location: locationFilter,
      });
      setResources(normalizeResources(data));
      setUsingMockData(false);
    } catch (e) {
      setResources(mockResources);
      setUsingMockData(true);
      setError(e?.message || "Could not load resources.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, minCapacityFilter, locationFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return resources.filter((r) => {
      const capacity = Number(r.capacity || 0);
      if (minCapacityFilter !== "" && Number.isFinite(Number(minCapacityFilter)) && capacity < Number(minCapacityFilter)) return false;
      if (locationFilter.trim() && !(String(r.location || "").toLowerCase().includes(locationFilter.trim().toLowerCase()))) return false;
      if (q) {
        const hay = `${r.code || ""} ${r.name || ""} ${r.type || ""} ${r.location || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resources, search, minCapacityFilter, locationFilter]);

  const onToggleStatus = async (resource) => {
    const next = resource.status === "ACTIVE" ? "OUT_OF_SERVICE" : "ACTIVE";
    const ok = window.confirm(`Change status to ${next} for ${resource.name || resource.code || "this resource"}?`);
    if (!ok) return;
    setBusyId(resource.id);
    try {
      await updateResourceStatus(resource.id, { status: next });
      await load();
    } catch {
      setResources((prev) => prev.map((r) => (r.id === resource.id ? { ...r, status: next } : r)));
    } finally {
      setBusyId("");
    }
  };

  const onDisable = async (resource) => {
    const ok = window.confirm(`Disable ${resource.name || resource.code || "this resource"}?`);
    if (!ok) return;
    setBusyId(resource.id);
    try {
      await disableResource(resource.id);
      await load();
    } catch {
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div style={pageCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#14213D", marginBottom: 4 }}>Resource Catalogue</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Manage facilities and assets in one place.</div>
        </div>
        <button type="button" style={smallBtnStyle("primary")}>+ Add Resource</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px 140px 1fr", gap: 12, marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} placeholder="Search code, name, type, location" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
          <option value="ALL">All Types</option>
          <option value="LECTURE_HALL">Lecture Hall</option>
          <option value="LAB">Lab</option>
          <option value="MEETING_ROOM">Meeting Room</option>
          <option value="EQUIPMENT">Equipment</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
        </select>
        <input value={minCapacityFilter} onChange={(e) => setMinCapacityFilter(e.target.value.replace(/[^\d]/g, ""))} style={inputStyle} placeholder="Min capacity" />
        <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={inputStyle} placeholder="Filter by location" />
      </div>

      {loading && <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Loading resources...</p>}
      {!loading && error && <p style={{ margin: "0 0 10px 0", color: "#b45309", fontWeight: 800 }}>Live API unavailable, showing sample data.</p>}
      {usingMockData && <p style={{ margin: "0 0 12px 0", color: "#475569", fontSize: 12, fontWeight: 700 }}>Tip: connect `/api/resources` endpoints to make this live.</p>}

      {!loading && (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Resource Code</th>
                <th style={thStyle}>Resource Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Capacity</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Availability</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={8}>No resources found.</td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id || r.code}>
                  <td style={tdStyle}>{r.code || r.resourceCode || "—"}</td>
                  <td style={tdStyle}>{r.name || r.resourceName || "—"}</td>
                  <td style={tdStyle}>{r.type || "—"}</td>
                  <td style={tdStyle}>{r.capacity ?? "—"}</td>
                  <td style={tdStyle}>{r.location || "—"}</td>
                  <td style={tdStyle}><span style={statusPill(r.status || "OUT_OF_SERVICE")}>{r.status || "OUT_OF_SERVICE"}</span></td>
                  <td style={tdStyle}>{r.availability || r.availabilityText || "—"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={smallBtnStyle()} onClick={() => window.alert(`View resource: ${r.name || r.code || ""}`)}>View</button>
                      <button type="button" style={smallBtnStyle()} onClick={() => window.alert(`Edit resource: ${r.name || r.code || ""}`)}>Edit</button>
                      <button type="button" style={smallBtnStyle("primary")} disabled={busyId === r.id} onClick={() => onToggleStatus(r)}>{(r.status || "OUT_OF_SERVICE") === "ACTIVE" ? "Change to Out of Service" : "Change to Active"}</button>
                      <button type="button" style={smallBtnStyle("danger")} disabled={busyId === r.id} onClick={() => onDisable(r)}>Delete / Disable</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
