import React, { useCallback, useEffect, useMemo, useState } from "react";
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
const primaryActionBtnStyle = {
  border: "none",
  background: "#FA8112",
  color: "#fff",
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
  if (variant === "primary") return { ...base, border: "1px solid #e5e7eb", color: "#0f172a", background: "#fff" };
  return { ...base, border: "1px solid #e5e7eb", color: "#0f172a" };
};

function statusToggleStyle(active, disabled) {
  return {
    width: 46,
    height: 26,
    borderRadius: 999,
    border: active ? "1px solid #86efac" : "1px solid #fecaca",
    background: active ? "#dcfce7" : "#fee2e2",
    padding: 2,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: active ? "flex-end" : "flex-start",
    transition: "all 0.15s ease",
    boxSizing: "border-box",
  };
}

const statusToggleKnobStyle = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
};

const iconOnlyBtnStyle = (variant = "neutral") => {
  if (variant === "danger") {
    return {
      width: 32,
      height: 32,
      borderRadius: 8,
      border: "none",
      background: "transparent",
      color: "#b91c1c",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    };
  }
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#0f172a",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
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

/** URLs safe to treat as persisted (server paths). Never blob/data previews — they break after refresh. */
function sanitizePersistedImageUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u) => typeof u === "string")
    .map((u) => u.trim())
    .filter((u) => u && !u.startsWith("blob:") && !u.startsWith("data:"));
}

function resourceWithSanitizedImages(resource) {
  if (!resource || typeof resource !== "object") return resource;
  const list = Array.isArray(resource.imageUrls) && resource.imageUrls.length > 0
    ? resource.imageUrls
    : resource.imageUrl
      ? [resource.imageUrl]
      : [];
  const clean = sanitizePersistedImageUrls(list);
  return { ...resource, imageUrls: clean, imageUrl: clean[0] || "" };
}

export default function AdminResourcesTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
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
    resourceImageFiles: [],
    resourceImagePreviews: [],
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
    imageUrls: [],
    newImageFiles: [],
    newImagePreviews: [],
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
      setResources(normalizeResources(data).map(resourceWithSanitizedImages));
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
      resourceImageFiles: [],
      resourceImagePreviews: [],
    });
    setCreateError("");
    setAddModalOpen(true);
  };

  const openViewDrawer = (resource) => {
    setSelectedResource(resource);
    setViewDrawerOpen(true);
    setEditDrawerOpen(false);
  };

  const openEditDrawer = (resource) => {
    setSelectedResource(resource);
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
      imageUrls: sanitizePersistedImageUrls(
        Array.isArray(resource.imageUrls) && resource.imageUrls.length > 0
          ? resource.imageUrls
          : resource.imageUrl
            ? [resource.imageUrl]
            : []
      ),
      newImageFiles: [],
      newImagePreviews: [],
    });
    setEditError("");
    setEditDrawerOpen(true);
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

    const payload = new FormData();
    payload.append("code", formData.resourceCode.trim());
    payload.append("name", formData.resourceName.trim());
    payload.append("type", formData.resourceType);
    payload.append("capacity", String(capacityNumber));
    payload.append("location", formData.location.trim());
    payload.append("description", formData.description.trim());
    payload.append("availability", formData.availabilityWindows.trim());
    payload.append("status", formData.status);
    for (const imageFile of formData.resourceImageFiles) {
      payload.append("images", imageFile);
    }

    setCreateBusy(true);
    setCreateError("");
    try {
      await createResource(payload);
      setAddModalOpen(false);
      await load();
    } catch {
      const localId = `tmp-${Date.now()}`;
      setResources((prev) => [{
        id: localId,
        code: formData.resourceCode.trim(),
        name: formData.resourceName.trim(),
        type: formData.resourceType,
        capacity: capacityNumber,
        location: formData.location.trim(),
        description: formData.description.trim(),
        availability: formData.availabilityWindows.trim(),
        status: formData.status,
        imageUrls: [],
        imageUrl: "",
      }, ...prev]);
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

    const payload = new FormData();
    payload.append("name", editFormData.resourceName.trim());
    payload.append("type", editFormData.resourceType);
    payload.append("capacity", String(capacityNumber));
    payload.append("location", editFormData.location.trim());
    payload.append("description", editFormData.description.trim());
    payload.append("availability", editFormData.availabilityWindows.trim());
    payload.append("status", editFormData.status);
    for (const kept of editFormData.imageUrls) {
      payload.append("keptImageUrls", kept);
    }
    for (const imageFile of editFormData.newImageFiles) {
      payload.append("images", imageFile);
    }

    setEditBusy(true);
    setEditError("");
    try {
      const updated = await updateResource(editResourceId, payload);
      if (updated?.resource) {
        setSelectedResource(updated.resource);
      }
      setEditDrawerOpen(false);
      await load();
    } catch (err) {
      if (String(editResourceId).startsWith("tmp-")) {
        setResources((prev) => prev.map((r) => {
          if (r.id !== editResourceId) return r;
          const keptOnly = sanitizePersistedImageUrls(editFormData.imageUrls);
          return {
            ...r,
            name: editFormData.resourceName.trim(),
            type: editFormData.resourceType,
            capacity: capacityNumber,
            location: editFormData.location.trim(),
            description: editFormData.description.trim(),
            availability: editFormData.availabilityWindows.trim(),
            status: editFormData.status,
            imageUrls: keptOnly,
            imageUrl: keptOnly[0] || "",
          };
        }));
        setEditDrawerOpen(false);
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
        <button type="button" style={{ ...smallBtnStyle("primary"), ...primaryActionBtnStyle }} onClick={openAddModal}>+ Add Resource</button>
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
                      <button type="button" style={smallBtnStyle()} onClick={() => openViewDrawer(r)}>View</button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => onToggleStatus(r)}
                        style={{ border: "none", background: "transparent", padding: 0, margin: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: busyId === r.id ? "not-allowed" : "pointer" }}
                        title={(r.status || "OUT_OF_SERVICE") === "ACTIVE" ? "Set Out of Service" : "Set Active"}
                        aria-label={(r.status || "OUT_OF_SERVICE") === "ACTIVE" ? "Set Out of Service" : "Set Active"}
                      >
                        <span style={statusToggleStyle((r.status || "OUT_OF_SERVICE") === "ACTIVE", busyId === r.id)}>
                          <span style={statusToggleKnobStyle} />
                        </span>
                      </button>
                      <button type="button" style={{ ...iconOnlyBtnStyle("danger"), opacity: busyId === r.id ? 0.7 : 1 }} disabled={busyId === r.id} onClick={() => onDelete(r)} title="Delete" aria-label="Delete">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M3.5 7.5h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M9 4.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M7.5 7.5l1 11a1.5 1.5 0 0 0 1.5 1.36h4a1.5 1.5 0 0 0 1.5-1.36l1-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 11v6M12 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
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
          style={{ position: "fixed", inset: 0, zIndex: 1002, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", overflowY: "auto" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setAddModalOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "860px", maxHeight: "calc(100vh - 36px)", margin: "auto 0", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e5e7eb", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Add Resource</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>Create a new facility or asset entry.</div>
              </div>
              <button type="button" onClick={() => setAddModalOpen(false)} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "999px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, fontSize: "20px", lineHeight: 1, cursor: "pointer", color: "#0f172a" }}>×</button>
            </div>

            <form onSubmit={handleCreateResource} style={{ padding: "18px 22px 22px", display: "grid", gap: "16px", overflowY: "auto" }}>
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

              <div>
                <label style={labelStyle}>Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ ...inputStyle, height: "auto", padding: "10px" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    const existingCount = formData.resourceImageFiles.length;
                    const allowed = Math.max(0, 3 - existingCount);
                    const selected = files.slice(0, allowed);
                    if (selected.length === 0) return;
                    updateForm("resourceImageFiles", [...formData.resourceImageFiles, ...selected]);
                    Promise.all(selected.map((file) => new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
                      reader.readAsDataURL(file);
                    }))).then((previews) => {
                      updateForm("resourceImagePreviews", [...formData.resourceImagePreviews, ...previews.filter(Boolean)]);
                    });
                    e.target.value = "";
                  }}
                />
                {formData.resourceImagePreviews.length > 0 ? (
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 8 }}>
                    {formData.resourceImagePreviews.map((src, idx) => (
                      <div key={`${src}-${idx}`} style={{ position: "relative" }}>
                        <img src={src} alt="Resource preview" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                        <button
                          type="button"
                          onClick={() => {
                            updateForm("resourceImageFiles", formData.resourceImageFiles.filter((_, i) => i !== idx));
                            updateForm("resourceImagePreviews", formData.resourceImagePreviews.filter((_, i) => i !== idx));
                          }}
                          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
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
                <button type="submit" disabled={createBusy} style={{ ...smallBtnStyle("primary"), ...primaryActionBtnStyle, opacity: createBusy ? 0.7 : 1 }}>
                  {createBusy ? "Creating..." : "Create Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewDrawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1003 }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.35)" }} onClick={() => { setViewDrawerOpen(false); setEditDrawerOpen(false); }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "24px", pointerEvents: "none" }}>
            {editDrawerOpen && (
              <aside style={{ width: "min(520px, 65vw)", maxHeight: "calc(100vh - 48px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", pointerEvents: "auto", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Edit Resource</div>
                  <button type="button" onClick={() => setEditDrawerOpen(false)} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 999, width: 32, height: 32, fontSize: 20, cursor: "pointer" }}>×</button>
                </div>
                <form onSubmit={handleEditResource} style={{ padding: 16, overflowY: "auto", display: "grid", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Resource Code</label>
                    <input value={editFormData.resourceCode} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#6b7280" }} readOnly disabled />
                  </div>
                  <div>
                    <label style={labelStyle}>Resource Name</label>
                    <input value={editFormData.resourceName} onChange={(e) => updateEditForm("resourceName", e.target.value)} style={inputStyle} required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                    <textarea value={editFormData.description} onChange={(e) => updateEditForm("description", e.target.value)} style={{ ...inputStyle, minHeight: 82, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Resource Image</label>
                    {[...editFormData.imageUrls, ...editFormData.newImagePreviews].length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(110px, 1fr))", gap: 8, marginBottom: 8 }}>
                        {editFormData.imageUrls.map((src, idx) => (
                          <div key={`existing-${src}-${idx}`} style={{ position: "relative" }}>
                            <img src={src} alt="Resource" style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                            <button
                              type="button"
                              onClick={() => updateEditForm("imageUrls", editFormData.imageUrls.filter((_, i) => i !== idx))}
                              style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                              aria-label="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {editFormData.newImagePreviews.map((src, idx) => (
                          <div key={`new-${src}-${idx}`} style={{ position: "relative" }}>
                            <img src={src} alt="Resource" style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                            <button
                              type="button"
                              onClick={() => {
                                updateEditForm("newImageFiles", editFormData.newImageFiles.filter((_, i) => i !== idx));
                                updateEditForm("newImagePreviews", editFormData.newImagePreviews.filter((_, i) => i !== idx));
                              }}
                              style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                              aria-label="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>No image available</div>}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ ...inputStyle, height: "auto", padding: 10 }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const totalExisting = editFormData.imageUrls.length + editFormData.newImageFiles.length;
                        const allowed = Math.max(0, 3 - totalExisting);
                        const selected = files.slice(0, allowed);
                        if (selected.length === 0) return;
                        updateEditForm("newImageFiles", [...editFormData.newImageFiles, ...selected]);
                        Promise.all(selected.map((file) => new Promise((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
                          reader.readAsDataURL(file);
                        }))).then((previews) => {
                          updateEditForm("newImagePreviews", [...editFormData.newImagePreviews, ...previews.filter(Boolean)]);
                        });
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Availability Windows</label>
                      <textarea value={editFormData.availabilityWindows} onChange={(e) => updateEditForm("availabilityWindows", e.target.value)} style={{ ...inputStyle, minHeight: 82, resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select value={editFormData.status} onChange={(e) => updateEditForm("status", e.target.value)} style={inputStyle}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                      </select>
                    </div>
                  </div>
                  {editError ? <p style={{ margin: 0, color: "#b91c1c", fontSize: 14, fontWeight: 700 }}>{editError}</p> : null}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" onClick={() => setEditDrawerOpen(false)} style={smallBtnStyle()}>Cancel</button>
                    <button type="submit" disabled={editBusy} style={{ ...smallBtnStyle("primary"), ...primaryActionBtnStyle, opacity: editBusy ? 0.7 : 1 }}>
                      {editBusy ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </aside>
            )}

            <aside style={{ width: "min(360px, 40vw)", maxHeight: "calc(100vh - 48px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", pointerEvents: "auto", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Resource Details</div>
                <button type="button" onClick={() => { setViewDrawerOpen(false); setEditDrawerOpen(false); }} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 999, width: 32, height: 32, fontSize: 20, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ padding: 16, overflowY: "auto", flex: 1, display: "grid", gap: 12 }}>
                {((Array.isArray(selectedResource?.imageUrls) && selectedResource.imageUrls.length > 0) || selectedResource?.imageUrl) ? (
                  <div>
                    <div style={labelStyle}>Image</div>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gap: 8 }}>
                      {(Array.isArray(selectedResource?.imageUrls) && selectedResource.imageUrls.length > 0
                        ? selectedResource.imageUrls
                        : [selectedResource?.imageUrl]
                      ).filter(Boolean).slice(0, 3).map((src, idx) => (
                        <img
                          key={`${src}-${idx}`}
                          src={src}
                          alt={selectedResource?.name || "Resource"}
                          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                <div><div style={labelStyle}>Resource Code</div><div>{selectedResource?.code || "—"}</div></div>
                <div><div style={labelStyle}>Name</div><div>{selectedResource?.name || "—"}</div></div>
                <div><div style={labelStyle}>Type</div><div>{selectedResource?.type || "—"}</div></div>
                <div><div style={labelStyle}>Capacity</div><div>{selectedResource?.capacity ?? "—"}</div></div>
                <div><div style={labelStyle}>Location</div><div>{selectedResource?.location || "—"}</div></div>
                <div><div style={labelStyle}>Description</div><div>{selectedResource?.description || "—"}</div></div>
                <div><div style={labelStyle}>Availability Windows</div><div>{selectedResource?.availability || "—"}</div></div>
                <div><div style={labelStyle}>Status</div><div>{selectedResource?.status || "—"}</div></div>
              </div>
              <div style={{ padding: 16, borderTop: "1px solid #e5e7eb", display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{ ...smallBtnStyle(), flex: 1, padding: "10px 12px", fontWeight: 800 }}
                  onClick={() => {
                    setViewDrawerOpen(false);
                    setEditDrawerOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{ ...smallBtnStyle("primary"), ...primaryActionBtnStyle, flex: 1, padding: "10px 12px" }}
                  onClick={() => openEditDrawer(selectedResource)}
                >
                  Edit
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
