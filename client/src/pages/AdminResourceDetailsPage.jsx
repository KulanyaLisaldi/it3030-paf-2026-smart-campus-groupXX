import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import { getAdminResourceById } from "../api/adminResources";

const cardStyle = {
  maxWidth: "100%",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
  padding: "20px",
  boxSizing: "border-box",
};

const labelStyle = { fontSize: "12px", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" };
const valueStyle = { marginTop: 6, color: "#0f172a", fontSize: "15px", fontWeight: 600, wordBreak: "break-word" };

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fieldValue(value) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

export default function AdminResourceDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resource, setResource] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminResourceById(id);
        if (!mounted) return;
        setResource(data && typeof data === "object" ? data : null);
      } catch (e) {
        if (!mounted) return;
        setResource(null);
        setError(e?.message || "Could not load resource details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  const rows = useMemo(() => {
    if (!resource) return [];
    return [
      { label: "Resource code", value: fieldValue(resource.code || resource.resourceCode) },
      { label: "Name", value: fieldValue(resource.name || resource.resourceName) },
      { label: "Type", value: fieldValue(resource.type) },
      { label: "Capacity", value: fieldValue(resource.capacity) },
      { label: "Location", value: fieldValue(resource.location) },
      { label: "Description", value: fieldValue(resource.description) },
      { label: "Weekly availability windows", value: fieldValue(resource.availability || resource.availabilityText) },
      { label: "Current status", value: fieldValue(resource.status) },
      { label: "Created date", value: formatDate(resource.createdAt) },
      { label: "Updated date", value: formatDate(resource.updatedAt) },
    ];
  }, [resource]);

  return (
    <AdminLayout
      activeSection="resources"
      pageTitle="Resource Details"
      description="View complete information for a selected resource."
    >
      <div style={{ marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => navigate("/adminresources")}
          style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800, fontSize: "13px", cursor: "pointer", color: "#0f172a" }}
        >
          Back to Resource Management
        </button>
      </div>

      <div style={cardStyle}>
        {loading && <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Loading resource details...</p>}
        {!loading && error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 800 }}>{error}</p>}

        {!loading && !error && resource && (
          <>
            {resource.imageUrl ? (
              <div style={{ marginBottom: 18 }}>
                <div style={labelStyle}>Resource image</div>
                <img
                  src={resource.imageUrl}
                  alt={resource.name || "Resource image"}
                  style={{ marginTop: 8, width: "100%", maxWidth: 420, maxHeight: 240, objectFit: "cover", borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 16px" }}>
              {rows.map((row) => (
                <div key={row.label}>
                  <div style={labelStyle}>{row.label}</div>
                  <div style={valueStyle}>{row.value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
