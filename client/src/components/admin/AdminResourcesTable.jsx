import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createResource, deleteResource, getAdminResources, previewResourceAvailabilityConflicts, updateResource, updateResourceStatus } from "../../api/adminResources";

const pageCardStyle = {
  maxWidth: "100%",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #FFDDB8",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
  padding: "18px",
  boxSizing: "border-box",
};
const tableStyle = { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" };
const thStyle = {
  textAlign: "left",
  padding: "10px",
  fontWeight: 900,
  color: "#374151",
  backgroundColor: "#FAF3E1",
  borderBottom: "1px solid #F5E7C6",
  whiteSpace: "nowrap",
};
const tdStyle = { padding: "10px", borderBottom: "1px solid #eef2f7", color: "#334155", verticalAlign: "top" };
/** Same pattern as AdminBookingsPage details table — table wider than viewport → horizontal scroll. */
const RESOURCE_TABLE_MIN_WIDTH = 1160;
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
/** Filter row only — matches page / table light orange border. */
const filterInputStyle = { ...inputStyle, border: "1px solid #FFDDB8" };

const RESOURCE_TABLE_PAGE_SIZE = 20;
const labelStyle = { display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 };
const summaryGridStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(140px, 1fr))", gap: "12px", marginBottom: "14px" };
/** Matches admin ticket dashboard metric cards: light border + left accent strip. */
const summaryCardBaseStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};
const summaryLabelStyle = { fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" };
const summaryValueStyle = { fontSize: "26px", fontWeight: 800, color: "#14213D", marginTop: 4 };
const primaryActionBtnStyle = {
  border: "none",
  background: "#FA8112",
  color: "#fff",
};
/** Match AdminBookingsPage details table action buttons */
const bookingTableButtonStyle = { height: 38, borderRadius: 9, border: "none", padding: "0 12px", fontWeight: 700, cursor: "pointer" };
const bookingTableActionStyle = { height: 32, width: 108, borderRadius: 8, fontSize: 12, boxSizing: "border-box", textAlign: "center" };
const DEFAULT_AVAILABILITY_START = "08:00";
const DEFAULT_AVAILABILITY_END = "18:00";

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
    border: active ? "1px solid #FFDDB8" : "1px solid #fecaca",
    background: active ? "#FFF4E6" : "#fee2e2",
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
  border: "1px solid #FFDDB8",
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

function parseClockToken(tokenRaw) {
  const token = String(tokenRaw || "").trim().toLowerCase().replace(".", ":");
  const m = token.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const suffix = m[3] || "";
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (suffix) {
    if (hour < 0 || hour > 12) return null;
    if (hour === 0) hour = 12;
    if (suffix === "am") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  if (hour === 24 && minute === 0) return 24 * 60;
  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseAvailabilityRange(raw) {
  const text = String(raw || "").trim();
  const timeTokens = text.match(/\d{1,2}[:.]\d{2}\s*(?:am|pm)?/gi) || [];
  if (timeTokens.length < 2) {
    return { start: DEFAULT_AVAILABILITY_START, end: DEFAULT_AVAILABILITY_END };
  }
  const startMin = parseClockToken(timeTokens[0]);
  let endMin = parseClockToken(timeTokens[1]);
  if (endMin === 0 && /am/i.test(timeTokens[1])) endMin = 24 * 60;
  if (startMin == null || endMin == null || startMin >= endMin) {
    return { start: DEFAULT_AVAILABILITY_START, end: DEFAULT_AVAILABILITY_END };
  }
  return { start: toHHMM(startMin), end: toHHMM(endMin) };
}

function availabilityText(start, end) {
  const s = String(start || "").trim();
  const e = String(end || "").trim();
  return `${s}-${e}`;
}

/** Parse HTML time value (HH:mm or HH:mm:ss) to minutes since midnight; null if invalid. */
function availabilityHhmmToMinutes(hhmm) {
  const s = String(hhmm || "").trim();
  if (!s) return null;
  const parts = s.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59 || h < 0 || h > 23) return null;
  return h * 60 + m;
}

/** Field-keyed errors for start/end (ordering message on end). */
function getAvailabilityFieldErrors(start, end) {
  const out = {};
  const s = String(start || "").trim();
  const t = String(end || "").trim();
  if (!s) out.availabilityStart = "Start time is required.";
  if (!t) out.availabilityEnd = "End time is required.";
  if (out.availabilityStart || out.availabilityEnd) return out;
  const startMin = availabilityHhmmToMinutes(start);
  const endMin = availabilityHhmmToMinutes(end);
  if (startMin == null || endMin == null) {
    out.availabilityEnd = "Enter valid availability times.";
    return out;
  }
  if (startMin >= endMin) {
    out.availabilityEnd = "End time must be later than start time.";
    return out;
  }
  return out;
}

const resourceRequiredMarkStyle = { color: "#f0a8a8", fontWeight: 800, marginLeft: 2 };
const resourceFieldErrorStyle = {
  margin: "6px 0 0",
  color: "#e57373",
  fontSize: 12,
  fontWeight: 600,
  fontStyle: "normal",
  lineHeight: 1.4,
  letterSpacing: "normal",
};

function ResourceFieldError({ message }) {
  if (!message) return null;
  return <p style={resourceFieldErrorStyle} role="alert">{message}</p>;
}

function buildCreateFieldErrors(fd) {
  const e = {};
  if (!String(fd.resourceCode || "").trim()) e.resourceCode = "Resource code is required.";
  if (!String(fd.resourceName || "").trim()) e.resourceName = "Resource name is required.";
  if (!String(fd.resourceType || "").trim()) e.resourceType = "Resource type is required.";
  const capRaw = String(fd.capacity ?? "").trim();
  if (!capRaw) e.capacity = "Capacity is required.";
  else {
    const n = Number(capRaw);
    if (!Number.isFinite(n) || n < 0) e.capacity = "Enter a valid capacity (0 or greater).";
  }
  if (!String(fd.location || "").trim()) e.location = "Location is required.";
  if (!fd.resourceImageFiles?.length) e.resourceImage = "Please upload at least one image.";
  Object.assign(e, getAvailabilityFieldErrors(fd.availabilityStart, fd.availabilityEnd));
  if (!String(fd.status || "").trim()) e.status = "Status is required.";
  return e;
}

function buildEditFieldErrors(fd) {
  const e = {};
  if (!String(fd.resourceName || "").trim()) e.resourceName = "Resource name is required.";
  if (!String(fd.resourceType || "").trim()) e.resourceType = "Resource type is required.";
  const capRaw = String(fd.capacity ?? "").trim();
  if (!capRaw) e.capacity = "Capacity is required.";
  else {
    const n = Number(capRaw);
    if (!Number.isFinite(n) || n < 0) e.capacity = "Enter a valid capacity (0 or greater).";
  }
  if (!String(fd.location || "").trim()) e.location = "Location is required.";
  const hasImage = (Array.isArray(fd.imageUrls) && fd.imageUrls.length > 0) || (Array.isArray(fd.newImageFiles) && fd.newImageFiles.length > 0);
  if (!hasImage) e.resourceImage = "Add or keep at least one image.";
  Object.assign(e, getAvailabilityFieldErrors(fd.availabilityStart, fd.availabilityEnd));
  if (!String(fd.status || "").trim()) e.status = "Status is required.";
  return e;
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
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [availabilityConflictDialog, setAvailabilityConflictDialog] = useState({
    open: false,
    affectedBookings: 0,
    oldAvailability: "",
    newAvailability: "",
    conflictingBookings: [],
  });
  const [formData, setFormData] = useState({
    resourceCode: "",
    resourceName: "",
    resourceType: "LECTURE_HALL",
    capacity: "",
    location: "",
    description: "",
    availabilityStart: DEFAULT_AVAILABILITY_START,
    availabilityEnd: DEFAULT_AVAILABILITY_END,
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
    availabilityStart: DEFAULT_AVAILABILITY_START,
    availabilityEnd: DEFAULT_AVAILABILITY_END,
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
  const [resourceTablePage, setResourceTablePage] = useState(1);

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

  useEffect(() => {
    setResourceTablePage(1);
  }, [search, typeFilter, statusFilter, minCapacityFilter, locationFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / RESOURCE_TABLE_PAGE_SIZE));
    setResourceTablePage((p) => Math.min(p, totalPages));
  }, [filtered.length]);

  const resourceTableTotalPages = Math.max(1, Math.ceil(filtered.length / RESOURCE_TABLE_PAGE_SIZE));
  const resourceTableCurrentPage = Math.min(resourceTablePage, resourceTableTotalPages);
  const paginatedResources = useMemo(() => {
    const start = (resourceTableCurrentPage - 1) * RESOURCE_TABLE_PAGE_SIZE;
    return filtered.slice(start, start + RESOURCE_TABLE_PAGE_SIZE);
  }, [filtered, resourceTableCurrentPage]);

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
    setCreateFieldErrors({});
  };

  const openAddModal = () => {
    setFormData({
      resourceCode: "",
      resourceName: "",
      resourceType: "LECTURE_HALL",
      capacity: "",
      location: "",
      description: "",
      availabilityStart: DEFAULT_AVAILABILITY_START,
      availabilityEnd: DEFAULT_AVAILABILITY_END,
      status: "ACTIVE",
      resourceImageFiles: [],
      resourceImagePreviews: [],
    });
    setCreateFieldErrors({});
    setAddModalOpen(true);
  };

  const openViewDrawer = (resource) => {
    setSelectedResource(resource);
    setViewDrawerOpen(true);
    setEditDrawerOpen(false);
  };

  const openEditDrawer = (resource) => {
    const parsedAvailability = parseAvailabilityRange(resource.availability || resource.availabilityText || "");
    setViewDrawerOpen(false);
    setSelectedResource(resource);
    setEditResourceId(resource.id || "");
    setEditFormData({
      resourceCode: resource.code || resource.resourceCode || "",
      resourceName: resource.name || resource.resourceName || "",
      resourceType: resource.type || "LECTURE_HALL",
      capacity: String(resource.capacity ?? ""),
      location: resource.location || "",
      description: resource.description || "",
      availabilityStart: parsedAvailability.start,
      availabilityEnd: parsedAvailability.end,
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
    setEditFieldErrors({});
    setEditDrawerOpen(true);
  };

  const updateEditForm = (key, value) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
    setEditFieldErrors({});
  };

  const submitEditResourceWithConflictAction = useCallback(async (conflictAction = "MARK_CONFLICTS") => {
    const fieldErrs = buildEditFieldErrors(editFormData);
    if (Object.keys(fieldErrs).length) {
      setEditFieldErrors(fieldErrs);
      setAvailabilityConflictDialog({ open: false, affectedBookings: 0, oldAvailability: "", newAvailability: "", conflictingBookings: [] });
      return;
    }
    try {
      setEditBusy(true);
      setEditFieldErrors({});
      const capacityNumber = Number(editFormData.capacity);
      const payload = new FormData();
      payload.append("name", editFormData.resourceName.trim());
      payload.append("type", editFormData.resourceType);
      payload.append("capacity", String(capacityNumber));
      payload.append("location", editFormData.location.trim());
      payload.append("description", editFormData.description.trim());
      payload.append("availability", availabilityText(editFormData.availabilityStart, editFormData.availabilityEnd));
      payload.append("status", editFormData.status);
      payload.append("conflictAction", conflictAction);
      for (const kept of editFormData.imageUrls) payload.append("keptImageUrls", kept);
      for (const imageFile of editFormData.newImageFiles) payload.append("images", imageFile);
      const updated = await updateResource(editResourceId, payload);
      if (updated?.resource) setSelectedResource(updated.resource);
      setEditDrawerOpen(false);
      setAvailabilityConflictDialog({ open: false, affectedBookings: 0, oldAvailability: "", newAvailability: "", conflictingBookings: [] });
      await load();
    } catch (err) {
      setEditFieldErrors({ general: err?.message || "Could not update resource." });
    } finally {
      setEditBusy(false);
    }
  }, [editFormData, editResourceId, load]);

  const handleCreateResource = async (e) => {
    e.preventDefault();
    const createErrs = buildCreateFieldErrors(formData);
    if (Object.keys(createErrs).length) {
      setCreateFieldErrors(createErrs);
      return;
    }
    const capacityNumber = Number(formData.capacity);

    const payload = new FormData();
    payload.append("code", formData.resourceCode.trim());
    payload.append("name", formData.resourceName.trim());
    payload.append("type", formData.resourceType);
    payload.append("capacity", String(capacityNumber));
    payload.append("location", formData.location.trim());
    payload.append("description", formData.description.trim());
    payload.append("availability", availabilityText(formData.availabilityStart, formData.availabilityEnd));
    payload.append("status", formData.status);
    for (const imageFile of formData.resourceImageFiles) {
      payload.append("images", imageFile);
    }

    setCreateBusy(true);
    setCreateFieldErrors({});
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
        availability: availabilityText(formData.availabilityStart, formData.availabilityEnd),
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
    if (!editResourceId) {
      setEditFieldErrors({ general: "Resource id is missing." });
      return;
    }
    const editErrs = buildEditFieldErrors(editFormData);
    if (Object.keys(editErrs).length) {
      setEditFieldErrors(editErrs);
      return;
    }
    const capacityNumber = Number(editFormData.capacity);

    setEditFieldErrors({});
    try {
      const oldAvailability = availabilityText(parseAvailabilityRange(selectedResource?.availability || "").start, parseAvailabilityRange(selectedResource?.availability || "").end);
      const newAvailability = availabilityText(editFormData.availabilityStart, editFormData.availabilityEnd);
      const isAvailabilityChanged = oldAvailability !== newAvailability;
      if (isAvailabilityChanged) {
        const preview = await previewResourceAvailabilityConflicts(editResourceId, newAvailability);
        const conflicts = Array.isArray(preview?.conflictingBookings) ? preview.conflictingBookings : [];
        if (conflicts.length > 0) {
          setAvailabilityConflictDialog({
            open: true,
            affectedBookings: Number(preview?.affectedBookings || conflicts.length),
            oldAvailability: String(preview?.oldAvailability || oldAvailability),
            newAvailability: String(preview?.newAvailability || newAvailability),
            conflictingBookings: conflicts,
          });
          return;
        }
      }
      await submitEditResourceWithConflictAction("MARK_CONFLICTS");
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
            availability: availabilityText(editFormData.availabilityStart, editFormData.availabilityEnd),
            status: editFormData.status,
            imageUrls: keptOnly,
            imageUrl: keptOnly[0] || "",
          };
        }));
        setEditDrawerOpen(false);
      } else {
        setEditFieldErrors({ general: err?.message || "Could not update resource." });
      }
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
        <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #14213D" }}>
          <div style={summaryLabelStyle}>Total Resources</div>
          <div style={summaryValueStyle}>{summary.total}</div>
        </div>
        <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #2e7d32" }}>
          <div style={summaryLabelStyle}>Active Resources</div>
          <div style={summaryValueStyle}>{summary.active}</div>
        </div>
        <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #d32f2f" }}>
          <div style={summaryLabelStyle}>Out of Service Resources</div>
          <div style={summaryValueStyle}>{summary.outOfService}</div>
        </div>
        <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #FA8112" }}>
          <div style={summaryLabelStyle}>Total Rooms</div>
          <div style={summaryValueStyle}>{summary.totalRooms}</div>
        </div>
        <div style={{ ...summaryCardBaseStyle, borderLeft: "6px solid #FCA311" }}>
          <div style={summaryLabelStyle}>Total Equipment</div>
          <div style={summaryValueStyle}>{summary.totalEquipment}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px 140px 1fr", gap: 12, marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} style={filterInputStyle} placeholder="Search code, name, type, location" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={filterInputStyle}>
          <option value="ALL">All Types</option>
          <option value="LECTURE_HALL">Lecture Hall</option>
          <option value="LAB">Lab</option>
          <option value="MEETING_ROOM">Meeting Room</option>
          <option value="EQUIPMENT">Equipment</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterInputStyle}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
        </select>
        <input value={minCapacityFilter} onChange={(e) => setMinCapacityFilter(e.target.value.replace(/[^\d]/g, ""))} style={filterInputStyle} placeholder="Min capacity" />
        <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={filterInputStyle} placeholder="Filter by location" />
      </div>

      {loading && <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Loading resources...</p>}
      {!loading && error && <p style={{ margin: "0 0 10px 0", color: "#b45309", fontWeight: 800 }}>{error}</p>}

      {!loading && (
        <div style={{ borderRadius: 12, border: "1px solid #FFDDB8", overflow: "hidden" }}>
          <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch" }}>
          <table style={{ ...tableStyle, width: "max-content", minWidth: RESOURCE_TABLE_MIN_WIDTH, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 120 }}>Resource Code</th>
                <th style={{ ...thStyle, minWidth: 180 }}>Resource Name</th>
                <th style={{ ...thStyle, minWidth: 140 }}>Type</th>
                <th style={{ ...thStyle, minWidth: 88 }}>Capacity</th>
                <th style={{ ...thStyle, minWidth: 260 }}>Location</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Status</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Availability</th>
                <th style={{ ...thStyle, minWidth: 300 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={8}>No resources found.</td>
                </tr>
              )}
              {paginatedResources.map((r) => (
                <tr key={r.id || r.code}>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.code || r.resourceCode || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.name || r.resourceName || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.type || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.capacity ?? "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.location || "—"}</td>
                  <td style={tdStyle}><span style={statusPill(r.status || "OUT_OF_SERVICE")}>{r.status || "OUT_OF_SERVICE"}</span></td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{r.availability || r.availabilityText || "—"}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center" }}>
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
                      <button type="button" onClick={() => openViewDrawer(r)} style={{ ...bookingTableButtonStyle, ...bookingTableActionStyle, background: "#fff", border: "1px solid #FFDDB8", color: "#0f172a" }}>View</button>
                      <button type="button" onClick={() => openEditDrawer(r)} style={{ ...bookingTableButtonStyle, ...bookingTableActionStyle, background: "#FA8112", color: "#fff", border: "none" }}>Edit</button>
                      <button type="button" disabled={busyId === r.id} onClick={() => onDelete(r)} style={{ ...bookingTableButtonStyle, ...bookingTableActionStyle, background: "#dc2626", color: "#fff", border: "none", opacity: busyId === r.id ? 0.7 : 1 }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filtered.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                padding: "12px 14px",
                borderTop: "1px solid #FFDDB8",
                backgroundColor: "#FAF3E1",
              }}
            >
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>
                Showing{" "}
                {`${(resourceTableCurrentPage - 1) * RESOURCE_TABLE_PAGE_SIZE + 1}–${Math.min(
                  resourceTableCurrentPage * RESOURCE_TABLE_PAGE_SIZE,
                  filtered.length
                )}`}{" "}
                of {filtered.length}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setResourceTablePage((p) => Math.max(1, p - 1))}
                  disabled={resourceTableCurrentPage <= 1}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: resourceTableCurrentPage <= 1 ? "#e5e7eb" : "#14213D",
                    color: "#FFFFFF",
                    cursor: resourceTableCurrentPage <= 1 ? "not-allowed" : "pointer",
                    opacity: resourceTableCurrentPage <= 1 ? 0.65 : 1,
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
                  Page {resourceTableCurrentPage} of {resourceTableTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setResourceTablePage((p) => Math.min(resourceTableTotalPages, p + 1))}
                  disabled={resourceTableCurrentPage >= resourceTableTotalPages}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor: resourceTableCurrentPage >= resourceTableTotalPages ? "#e5e7eb" : "#14213D",
                    color: "#FFFFFF",
                    cursor: resourceTableCurrentPage >= resourceTableTotalPages ? "not-allowed" : "pointer",
                    opacity: resourceTableCurrentPage >= resourceTableTotalPages ? 0.65 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 1002, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", overflowY: "auto" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setAddModalOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "860px", maxHeight: "calc(100vh - 36px)", margin: "auto 0", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #FFDDB8", boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #FFDDB8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Add Resource</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>Create a new facility or asset entry.</div>
              </div>
              <button type="button" onClick={() => setAddModalOpen(false)} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "999px", border: "1px solid #FFDDB8", background: "#fff", fontWeight: 900, fontSize: "20px", lineHeight: 1, cursor: "pointer", color: "#0f172a" }}>×</button>
            </div>

            <form onSubmit={handleCreateResource} style={{ padding: "18px 22px 22px", display: "grid", gap: "16px", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>
                    Resource Code
                    <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                  </label>
                  <input value={formData.resourceCode} onChange={(e) => updateForm("resourceCode", e.target.value)} style={filterInputStyle} placeholder="LAB-C-204" />
                  <ResourceFieldError message={createFieldErrors.resourceCode} />
                </div>
                <div>
                  <label style={labelStyle}>
                    Resource Name
                    <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                  </label>
                  <input value={formData.resourceName} onChange={(e) => updateForm("resourceName", e.target.value)} style={filterInputStyle} placeholder="Computer Lab C204" />
                  <ResourceFieldError message={createFieldErrors.resourceName} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>
                    Resource Type
                    <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                  </label>
                  <select value={formData.resourceType} onChange={(e) => updateForm("resourceType", e.target.value)} style={filterInputStyle}>
                    <option value="LECTURE_HALL">Lecture Hall</option>
                    <option value="LAB">Lab</option>
                    <option value="MEETING_ROOM">Meeting Room</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                  <ResourceFieldError message={createFieldErrors.resourceType} />
                </div>
                <div>
                  <label style={labelStyle}>
                    Capacity
                    <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                  </label>
                  <input value={formData.capacity} onChange={(e) => updateForm("capacity", e.target.value.replace(/[^\d]/g, ""))} style={filterInputStyle} placeholder="40" />
                  <ResourceFieldError message={createFieldErrors.capacity} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Location
                  <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                </label>
                <input value={formData.location} onChange={(e) => updateForm("location", e.target.value)} style={filterInputStyle} placeholder="Engineering Block C - Floor 2" />
                <ResourceFieldError message={createFieldErrors.location} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={formData.description} onChange={(e) => updateForm("description", e.target.value)} style={{ ...filterInputStyle, minHeight: "88px", resize: "vertical" }} placeholder="Short description of the resource" />
              </div>

              <div>
                <label style={labelStyle}>
                  Upload Image
                  <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ ...filterInputStyle, height: "auto", padding: "10px" }}
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
                <ResourceFieldError message={createFieldErrors.resourceImage} />
                {formData.resourceImagePreviews.length > 0 ? (
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 8 }}>
                    {formData.resourceImagePreviews.map((src, idx) => (
                      <div key={`${src}-${idx}`} style={{ position: "relative" }}>
                        <img src={src} alt="Resource preview" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid #FFDDB8" }} />
                        <button
                          type="button"
                          onClick={() => {
                            updateForm("resourceImageFiles", formData.resourceImageFiles.filter((_, i) => i !== idx));
                            updateForm("resourceImagePreviews", formData.resourceImagePreviews.filter((_, i) => i !== idx));
                          }}
                          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "1px solid #FFDDB8", background: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
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
                  <label style={labelStyle}>
                    Availability Start
                    <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                  </label>
                  <input type="time" value={formData.availabilityStart} onChange={(e) => updateForm("availabilityStart", e.target.value)} style={filterInputStyle} />
                  <ResourceFieldError message={createFieldErrors.availabilityStart} />
                </div>
                <div>
                  <label style={labelStyle}>
                    Availability End
                    <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                  </label>
                  <input type="time" value={formData.availabilityEnd} onChange={(e) => updateForm("availabilityEnd", e.target.value)} style={filterInputStyle} />
                  <ResourceFieldError message={createFieldErrors.availabilityEnd} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>
                  Status
                  <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                </label>
                <select value={formData.status} onChange={(e) => updateForm("status", e.target.value)} style={filterInputStyle}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                </select>
                <ResourceFieldError message={createFieldErrors.status} />
              </div>

              <ResourceFieldError message={createFieldErrors.general} />

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

      {(viewDrawerOpen || editDrawerOpen) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1003 }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(15,23,42,0.35)" }} onClick={() => { setViewDrawerOpen(false); setEditDrawerOpen(false); }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "24px", pointerEvents: "none" }}>
            {editDrawerOpen && (
              <aside style={{ width: "min(520px, 65vw)", maxHeight: "calc(100vh - 48px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", pointerEvents: "auto", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Edit Resource</div>
                  <button type="button" onClick={() => { setEditDrawerOpen(false); }} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 999, width: 32, height: 32, fontSize: 20, cursor: "pointer" }}>×</button>
                </div>
                <form onSubmit={handleEditResource} style={{ padding: 16, overflowY: "auto", display: "grid", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Resource Code</label>
                    <input value={editFormData.resourceCode} style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#6b7280" }} readOnly disabled />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Resource Name
                      <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                    </label>
                    <input value={editFormData.resourceName} onChange={(e) => updateEditForm("resourceName", e.target.value)} style={inputStyle} />
                    <ResourceFieldError message={editFieldErrors.resourceName} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>
                        Resource Type
                        <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                      </label>
                      <select value={editFormData.resourceType} onChange={(e) => updateEditForm("resourceType", e.target.value)} style={inputStyle}>
                        <option value="LECTURE_HALL">Lecture Hall</option>
                        <option value="LAB">Lab</option>
                        <option value="MEETING_ROOM">Meeting Room</option>
                        <option value="EQUIPMENT">Equipment</option>
                      </select>
                      <ResourceFieldError message={editFieldErrors.resourceType} />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Capacity
                        <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                      </label>
                      <input value={editFormData.capacity} onChange={(e) => updateEditForm("capacity", e.target.value.replace(/[^\d]/g, ""))} style={inputStyle} />
                      <ResourceFieldError message={editFieldErrors.capacity} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Location
                      <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                    </label>
                    <input value={editFormData.location} onChange={(e) => updateEditForm("location", e.target.value)} style={inputStyle} />
                    <ResourceFieldError message={editFieldErrors.location} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={editFormData.description} onChange={(e) => updateEditForm("description", e.target.value)} style={{ ...inputStyle, minHeight: 82, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Resource Image
                      <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                    </label>
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
                    <ResourceFieldError message={editFieldErrors.resourceImage} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>
                        Availability Start
                        <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                      </label>
                      <input type="time" value={editFormData.availabilityStart} onChange={(e) => updateEditForm("availabilityStart", e.target.value)} style={inputStyle} />
                      <ResourceFieldError message={editFieldErrors.availabilityStart} />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Availability End
                        <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                      </label>
                      <input type="time" value={editFormData.availabilityEnd} onChange={(e) => updateEditForm("availabilityEnd", e.target.value)} style={inputStyle} />
                      <ResourceFieldError message={editFieldErrors.availabilityEnd} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Status
                      <span style={resourceRequiredMarkStyle} aria-hidden="true">*</span>
                    </label>
                    <select value={editFormData.status} onChange={(e) => updateEditForm("status", e.target.value)} style={inputStyle}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                    </select>
                    <ResourceFieldError message={editFieldErrors.status} />
                  </div>
                  <ResourceFieldError message={editFieldErrors.general} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" onClick={() => setEditDrawerOpen(false)} style={{ ...bookingTableButtonStyle, background: "#fff", color: "#0f172a", border: "1px solid #FFDDB8", minWidth: 108 }}>Cancel</button>
                    <button type="submit" disabled={editBusy} style={{ ...bookingTableButtonStyle, background: "#FA8112", color: "#fff", border: "none", opacity: editBusy ? 0.7 : 1, minWidth: 120 }}>
                      {editBusy ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </aside>
            )}

            {viewDrawerOpen && (
            <aside style={{ width: "min(440px, 46vw)", maxHeight: "calc(100vh - 48px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", pointerEvents: "auto", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Resource Details</div>
                <button type="button" onClick={() => setViewDrawerOpen(false)} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 999, width: 32, height: 32, fontSize: 20, cursor: "pointer" }}>×</button>
              </div>
              <div
                style={{
                  padding: 16,
                  overflowY: "auto",
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  columnGap: 14,
                  rowGap: 14,
                  alignContent: "start",
                }}
              >
                {((Array.isArray(selectedResource?.imageUrls) && selectedResource.imageUrls.length > 0) || selectedResource?.imageUrl) ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={labelStyle}>Image</div>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
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
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle}>Resource Code</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13, wordBreak: "break-word" }}>{selectedResource?.code || "—"}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle}>Name</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13, wordBreak: "break-word" }}>{selectedResource?.name || "—"}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle}>Type</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13, wordBreak: "break-word" }}>{selectedResource?.type || "—"}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle}>Capacity</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13 }}>{selectedResource?.capacity ?? "—"}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle}>Location</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13, wordBreak: "break-word" }}>{selectedResource?.location || "—"}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={labelStyle}>Availability Windows</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13, wordBreak: "break-word" }}>{selectedResource?.availability || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                  <div style={labelStyle}>Description</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13, lineHeight: 1.45, wordBreak: "break-word" }}>{selectedResource?.description || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                  <div style={labelStyle}>Status</div>
                  <div style={{ marginTop: 4, color: "#334155", fontWeight: 600, fontSize: 13 }}>{selectedResource?.status || "—"}</div>
                </div>
              </div>
            </aside>
            )}
          </div>
        </div>
      )}

      {availabilityConflictDialog.open && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1100, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <div style={{ width: "100%", maxWidth: 840, background: "#fff", borderRadius: 14, border: "1px solid #fecaca", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 18 }}>
            <h3 style={{ margin: "0 0 8px", color: "#991b1b", fontSize: 20, fontWeight: 900 }}>Availability conflict detected</h3>
            <p style={{ margin: 0, color: "#334155", fontWeight: 600 }}>
              This availability change conflicts with {availabilityConflictDialog.affectedBookings} existing bookings. You can save and cancel these bookings now.
            </p>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
              <div><strong>Old window:</strong> {availabilityConflictDialog.oldAvailability || "—"}</div>
              <div><strong>New window:</strong> {availabilityConflictDialog.newAvailability || "—"}</div>
            </div>
            <div style={{ marginTop: 12, maxHeight: 220, overflowY: "auto", border: "1px solid #fee2e2", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#fff1f2" }}>
                    {["Booking ID", "Date", "Start", "End", "Status"].map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #fee2e2" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {availabilityConflictDialog.conflictingBookings.map((b) => (
                    <tr key={b.bookingId}>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #fef2f2" }}>{b.bookingId}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #fef2f2" }}>{b.bookingDate}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #fef2f2" }}>{b.startTime}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #fef2f2" }}>{b.endTime}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #fef2f2" }}>{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button type="button" style={smallBtnStyle()} onClick={() => setAvailabilityConflictDialog({ open: false, affectedBookings: 0, oldAvailability: "", newAvailability: "", conflictingBookings: [] })}>Close</button>
              <button type="button" style={{ ...smallBtnStyle("primary"), ...primaryActionBtnStyle }} onClick={() => void submitEditResourceWithConflictAction("CANCEL_CONFLICTING")}>Save and cancel bookings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
