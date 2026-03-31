import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createResource, deleteResource, getAdminResources, updateResource, updateResourceStatus } from "../../api/adminResources";

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
const labelStyle = { display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 };
const summaryGridStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(140px, 1fr))", gap: "12px", marginBottom: "14px" };
const summaryCardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "12px",
  boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [formData, setFormData] = useState({
    resourceCode: "",
    resourceName: "",
    resourceType: "LECTURE_HALL",
    capacity: "",
    location: "",
    description: "",
    availabilityWindows: "",
    status: "ACTIVE",
  });
  const [editResourceId, setEditResourceId] = useState("");
  const [editFormData, setEditFormData] = useState({
    resourceCode: "",
    resourceName: "",
    resourceType: "LECTURE_HALL",
    capacity: "",
    location: "",
    description: "",
    availabilityWindows: "",
    status: "ACTIVE",
  });

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
    } catch (e) {
      setResources([]);
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

  const summary = useMemo(() => {
    const total = resources.length;
    const active = resources.filter((r) => String(r.status || "").toUpperCase() === "ACTIVE").length;
    const outOfService = resources.filter((r) => String(r.status || "").toUpperCase() === "OUT_OF_SERVICE").length;
    const totalRooms = resources.filter((r) => ["LECTURE_HALL", "LAB", "MEETING_ROOM"].includes(String(r.type || "").toUpperCase())).length;
    const totalEquipment = resources.filter((r) => String(r.type || "").toUpperCase() === "EQUIPMENT").length;
    return { total, active, outOfService, totalRooms, totalEquipment };
  }, [resources]);

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

  const onDelete = async (resource) => {
    const ok = window.confirm(`Delete ${resource.name || resource.code || "this resource"}? This cannot be undone.`);
    if (!ok) return;
    setBusyId(resource.id);
    try {
      await deleteResource(resource.id);
      await load();
    } catch {
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
    } finally {
      setBusyId("");
    }
  };

  const updateForm = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setCreateError("");
  };

  const openAddModal = () => {
    setFormData({
      resourceCode: "",
      resourceName: "",
      resourceType: "LECTURE_HALL",
      capacity: "",
      location: "",
      description: "",
      availabilityWindows: "",
      status: "ACTIVE",
    });
    setCreateError("");
    setAddModalOpen(true);
  };

  const openEditModal = (resource) => {
    setEditResourceId(resource.id || "");
    setEditFormData({
      resourceCode: resource.code || resource.resourceCode || "",
      resourceName: resource.name || resource.resourceName || "",
      resourceType: resource.type || "LECTURE_HALL",
      capacity: String(resource.capacity ?? ""),
      location: resource.location || "",
      description: resource.description || "",
      availabilityWindows: resource.availability || resource.availabilityText || "",
      status: resource.status || "ACTIVE",
    });
    setEditError("");
    setEditModalOpen(true);
  };

  const updateEditForm = (key, value) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
    setEditError("");
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    const capacityNumber = Number(formData.capacity);
    if (!formData.resourceCode.trim() || !formData.resourceName.trim() || !formData.location.trim()) {
      setCreateError("Resource code, name, and location are required.");
      return;
    }
    if (!Number.isFinite(capacityNumber) || capacityNumber < 0) {
      setCreateError("Capacity must be a valid number.");
      return;
    }

    const payload = {
      code: formData.resourceCode.trim(),
      name: formData.resourceName.trim(),
      type: formData.resourceType,
      capacity: capacityNumber,
      location: formData.location.trim(),
      description: formData.description.trim(),
      availability: formData.availabilityWindows.trim(),
      status: formData.status,
    };

    setCreateBusy(true);
    setCreateError("");
    try {
      await createResource(payload);
      setAddModalOpen(false);
      await load();
    } catch {
      const localId = `tmp-${Date.now()}`;
      setResources((prev) => [{ id: localId, ...payload }, ...prev]);
      setAddModalOpen(false);
    } finally {
      setCreateBusy(false);
    }
  };

  const handleEditResource = async (e) => {
    e.preventDefault();
    const capacityNumber = Number(editFormData.capacity);
    if (!editResourceId) {
      setEditError("Resource id is missing.");
      return;
    }
    if (!editFormData.resourceName.trim() || !editFormData.location.trim()) {
      setEditError("Resource name and location are required.");
      return;
    }
    if (!Number.isFinite(capacityNumber) || capacityNumber < 0) {
      setEditError("Capacity must be a valid number.");
      return;
    }

    const payload = {
      name: editFormData.resourceName.trim(),
      type: editFormData.resourceType,
      capacity: capacityNumber,
      location: editFormData.location.trim(),
      description: editFormData.description.trim(),
      availability: editFormData.availabilityWindows.trim(),
      status: editFormData.status,
    };

    setEditBusy(true);
    setEditError("");
    try {
      await updateResource(editResourceId, payload);
      setEditModalOpen(false);
      await load();
    } catch (err) {
      if (String(editResourceId).startsWith("tmp-")) {
        setResources((prev) => prev.map((r) => (
          r.id === editResourceId
            ? { ...r, ...payload }
            : r
        )));
        setEditModalOpen(false);
      } else {
        setEditError(err?.message || "Could not update resource.");
      }
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <div style={pageCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#14213D", marginBottom: 4 }}>Resource Catalogue</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Manage facilities and assets in one place.</div>
        </div>
        <button type="button" style={smallBtnStyle("primary")} onClick={openAddModal}>+ Add Resource</button>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Total Resources</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{summary.total}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Active Resources</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#166534", marginTop: 4 }}>{summary.active}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Out of Service Resources</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#991b1b", marginTop: 4 }}>{summary.outOfService}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Total Rooms</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{summary.totalRooms}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: "11px", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Total Equipment</div>
          <div style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{summary.totalEquipment}</div>
        </div>
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
      {!loading && error && <p style={{ margin: "0 0 10px 0", color: "#b45309", fontWeight: 800 }}>{error}</p>}

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
                      <button type="button" style={smallBtnStyle()} onClick={() => navigate(`/adminresources/${encodeURIComponent(r.id || "")}`)} disabled={!r.id}>View</button>
                      <button type="button" style={smallBtnStyle()} onClick={() => openEditModal(r)}>Edit</button>
                      <button type="button" style={smallBtnStyle("primary")} disabled={busyId === r.id} onClick={() => onToggleStatus(r)}>{(r.status || "OUT_OF_SERVICE") === "ACTIVE" ? "Change to Out of Service" : "Change to Active"}</button>
                      <button type="button" style={smallBtnStyle("danger")} disabled={busyId === r.id} onClick={() => onDelete(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 1002, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setAddModalOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "860px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Add Resource</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>Create a new facility or asset entry.</div>
              </div>
              <button type="button" onClick={() => setAddModalOpen(false)} style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, fontSize: "14px", cursor: "pointer", color: "#0f172a" }}>Cancel</button>
            </div>

            <form onSubmit={handleCreateResource} style={{ padding: "18px 22px 22px", display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Resource Code</label>
                  <input value={formData.resourceCode} onChange={(e) => updateForm("resourceCode", e.target.value)} style={inputStyle} placeholder="LAB-C-204" required />
                </div>
                <div>
                  <label style={labelStyle}>Resource Name</label>
                  <input value={formData.resourceName} onChange={(e) => updateForm("resourceName", e.target.value)} style={inputStyle} placeholder="Computer Lab C204" required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Resource Type</label>
                  <select value={formData.resourceType} onChange={(e) => updateForm("resourceType", e.target.value)} style={inputStyle}>
                    <option value="LECTURE_HALL">Lecture Hall</option>
                    <option value="LAB">Lab</option>
                    <option value="MEETING_ROOM">Meeting Room</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Capacity</label>
                  <input value={formData.capacity} onChange={(e) => updateForm("capacity", e.target.value.replace(/[^\d]/g, ""))} style={inputStyle} placeholder="40" required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Location</label>
                <input value={formData.location} onChange={(e) => updateForm("location", e.target.value)} style={inputStyle} placeholder="Engineering Block C - Floor 2" required />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={formData.description} onChange={(e) => updateForm("description", e.target.value)} style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }} placeholder="Short description of the resource" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Availability Windows</label>
                  <textarea value={formData.availabilityWindows} onChange={(e) => updateForm("availabilityWindows", e.target.value)} style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }} placeholder="Mon-Fri 08:00-18:00" />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={formData.status} onChange={(e) => updateForm("status", e.target.value)} style={inputStyle}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                  </select>
                </div>
              </div>

              {createError ? <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 700 }}>{createError}</p> : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setAddModalOpen(false)} style={smallBtnStyle()}>Cancel</button>
                <button type="submit" disabled={createBusy} style={{ ...smallBtnStyle("primary"), opacity: createBusy ? 0.7 : 1 }}>
                  {createBusy ? "Creating..." : "Create Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 1002, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEditModalOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "860px", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Edit Resource</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>Update existing resource details.</div>
              </div>
              <button type="button" onClick={() => setEditModalOpen(false)} style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, fontSize: "14px", cursor: "pointer", color: "#0f172a" }}>Cancel</button>
            </div>

            <form onSubmit={handleEditResource} style={{ padding: "18px 22px 22px", display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Resource Code</label>
                  <input value={editFormData.resourceCode} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#6b7280" }} readOnly disabled />
                </div>
                <div>
                  <label style={labelStyle}>Resource Name</label>
                  <input value={editFormData.resourceName} onChange={(e) => updateEditForm("resourceName", e.target.value)} style={inputStyle} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Resource Type</label>
                  <select value={editFormData.resourceType} onChange={(e) => updateEditForm("resourceType", e.target.value)} style={inputStyle}>
                    <option value="LECTURE_HALL">Lecture Hall</option>
                    <option value="LAB">Lab</option>
                    <option value="MEETING_ROOM">Meeting Room</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Capacity</label>
                  <input value={editFormData.capacity} onChange={(e) => updateEditForm("capacity", e.target.value.replace(/[^\d]/g, ""))} style={inputStyle} required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Location</label>
                <input value={editFormData.location} onChange={(e) => updateEditForm("location", e.target.value)} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={editFormData.description} onChange={(e) => updateEditForm("description", e.target.value)} style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Availability Windows</label>
                  <textarea value={editFormData.availabilityWindows} onChange={(e) => updateEditForm("availabilityWindows", e.target.value)} style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={editFormData.status} onChange={(e) => updateEditForm("status", e.target.value)} style={inputStyle}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                  </select>
                </div>
              </div>

              {editError ? <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 700 }}>{editError}</p> : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setEditModalOpen(false)} style={smallBtnStyle()}>Cancel</button>
                <button type="submit" disabled={editBusy} style={{ ...smallBtnStyle("primary"), opacity: editBusy ? 0.7 : 1 }}>
                  {editBusy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
