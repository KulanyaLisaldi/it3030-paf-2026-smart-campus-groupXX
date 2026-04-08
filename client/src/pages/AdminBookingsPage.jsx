import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import { cancelBookingByAdmin, deleteBookingByAdmin, getAdminBookings, approveBookingByAdmin, rejectBookingByAdmin } from "../api/bookings";

const panelStyle = { backgroundColor: "#FFFFFF", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.04)", padding: "14px" };
const inputStyle = { width: "100%", height: 40, borderRadius: 10, border: "1px solid #d1d5db", padding: "0 10px", boxSizing: "border-box", fontSize: 14 };
const buttonStyle = { height: 38, borderRadius: 9, border: "none", padding: "0 12px", fontWeight: 700, cursor: "pointer" };
const actionControlStyle = { height: 32, width: 108, borderRadius: 8, fontSize: 12, boxSizing: "border-box" };

function statusChip(statusRaw) {
  const status = String(statusRaw || "").toUpperCase();
  if (status === "APPROVED") return { background: "#dcfce7", color: "#166534" };
  if (status === "REJECTED") return { background: "#fee2e2", color: "#b91c1c" };
  if (status === "CANCELLED") return { background: "#e5e7eb", color: "#374151" };
  return { background: "#dbeafe", color: "#1d4ed8" };
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function canApprove(status) {
  return String(status || "").toUpperCase() === "PENDING";
}
function canReject(status) {
  return String(status || "").toUpperCase() === "PENDING";
}
function canCancel(status) {
  const s = String(status || "").toUpperCase();
  return s === "APPROVED";
}
function canDelete(status) {
  const s = String(status || "").toUpperCase();
  return s === "REJECTED" || s === "CANCELLED";
}
function cancellationOrRejectionReason(row) {
  const status = String(row?.status || "").toUpperCase();
  if (status === "REJECTED") return row?.reviewReason || "";
  if (status === "CANCELLED") return row?.cancellationReason || row?.reviewReason || "";
  return row?.reviewReason || row?.cancellationReason || "";
}
function cancellationOrRejectionLabel(row) {
  const status = String(row?.status || "").toUpperCase();
  if (status === "REJECTED") return "Admin rejection reason";
  if (status === "CANCELLED") return row?.cancellationReason ? "User cancellation reason" : "Admin cancellation reason";
  return "Reason";
}

function countByStatus(rows) {
  const counts = { total: rows.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
  rows.forEach((row) => {
    const s = String(row?.status || "").toUpperCase();
    if (s === "PENDING") counts.pending += 1;
    if (s === "APPROVED") counts.approved += 1;
    if (s === "REJECTED") counts.rejected += 1;
    if (s === "CANCELLED") counts.cancelled += 1;
  });
  return counts;
}


export default function AdminBookingsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [actionModal, setActionModal] = useState({ type: "", row: null, reason: "", error: "" });
  const [filters, setFilters] = useState({
    status: "ALL",
    date: "",
    resourceType: "ALL",
    resource: "",
    user: "",
    approvalState: "ALL",
  });
  const [activeTab, setActiveTab] = useState("dashboard");

  const loadRows = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminBookings(nextFilters);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(filters);
  }, [filters]);

  const resourceTypes = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const t = String(r.resourceType || "").trim().toUpperCase();
      if (t) set.add(t);
    });
    return ["ALL", ...Array.from(set)];
  }, [rows]);

  const statusCounts = useMemo(() => countByStatus(rows), [rows]);

  const openAction = (type, row) => setActionModal({ type, row, reason: "", error: "" });
  const closeAction = () => setActionModal({ type: "", row: null, reason: "", error: "" });

  const handleApproveDirect = async (row) => {
    if (!row?.id || !canApprove(row.status)) return;
    setBusyId(row.id);
    try {
      const response = await approveBookingByAdmin(row.id, "");
      const updated = response?.booking;
      if (updated?.id) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        if (viewRow?.id === updated.id) setViewRow((v) => ({ ...v, ...updated }));
      } else {
        await loadRows();
      }
    } catch (e) {
      setError(e?.message || "Could not approve booking.");
    } finally {
      setBusyId("");
    }
  };

  const handleConfirmAction = async () => {
    const row = actionModal.row;
    if (!row?.id) return;
    const reason = (actionModal.reason || "").trim();
    if (actionModal.type === "reject" && !reason) {
      setActionModal((s) => ({ ...s, error: "Rejection reason is required." }));
      return;
    }
    if (actionModal.type === "cancel" && !reason) {
      setActionModal((s) => ({ ...s, error: "Cancellation reason is required." }));
      return;
    }
    setBusyId(row.id);
    try {
      let response = null;
      if (actionModal.type === "reject") response = await rejectBookingByAdmin(row.id, reason);
      if (actionModal.type === "cancel") response = await cancelBookingByAdmin(row.id, reason);
      if (actionModal.type === "delete") response = await deleteBookingByAdmin(row.id);
      const updated = response?.booking;
      if (actionModal.type === "delete") {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        if (viewRow?.id === row.id) setViewRow(null);
      } else if (updated?.id) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        if (viewRow?.id === updated.id) setViewRow((v) => ({ ...v, ...updated }));
      } else {
        await loadRows();
      }
      closeAction();
    } catch (e) {
      setActionModal((s) => ({ ...s, error: e?.message || "Action failed." }));
    } finally {
      setBusyId("");
    }
  };

  return (
    <AdminLayout activeSection="bookings" pageTitle="Booking Management" description="Review booking requests, approve/reject decisions, monitor conflicts, and manage booking lifecycle.">
      <section style={panelStyle}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
            {[
              { label: "Total Bookings", value: statusCounts.total },
              { label: "Pending", value: statusCounts.pending },
              { label: "Approved", value: statusCounts.approved },
              { label: "Rejected", value: statusCounts.rejected },
              { label: "Cancelled", value: statusCounts.cancelled },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: "linear-gradient(160deg, #ffffff 0%, #f8fafc 65%, #eef2ff 100%)",
                  border: "1px solid #dbe4ee",
                  borderRadius: 14,
                  padding: "12px 14px",
                  minHeight: 76,
                  boxShadow: "0 10px 20px rgba(15,23,42,0.12), 0 2px 4px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
                  transform: "translateZ(0)",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{card.label}</p>
                <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{card.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            style={{
              ...buttonStyle,
              height: 34,
              background: "transparent",
              borderRadius: 0,
              borderBottom: activeTab === "dashboard" ? "2px solid #FA8112" : "2px solid transparent",
              color: activeTab === "dashboard" ? "#0f172a" : "#64748b",
              padding: "0 2px",
            }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            style={{
              ...buttonStyle,
              height: 34,
              background: "transparent",
              borderRadius: 0,
              borderBottom: activeTab === "details" ? "2px solid #FA8112" : "2px solid transparent",
              color: activeTab === "details" ? "#0f172a" : "#64748b",
              padding: "0 2px",
            }}
          >
            Booking Details
          </button>
          </div>

          {activeTab === "dashboard" && (
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Dashboard</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                Charts are removed for now. You can add them later.
              </p>
            </div>
          )}

          {activeTab === "details" && (
            <>
      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))} style={inputStyle}>
            <option value="ALL">Status: All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input type="date" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value }))} style={inputStyle} />
          <select value={filters.resourceType} onChange={(e) => setFilters((s) => ({ ...s, resourceType: e.target.value }))} style={inputStyle}>
            {resourceTypes.map((t) => <option key={t} value={t}>{t === "ALL" ? "Resource Type: All" : t}</option>)}
          </select>
          <input value={filters.resource} onChange={(e) => setFilters((s) => ({ ...s, resource: e.target.value }))} style={inputStyle} placeholder="Resource name/id" />
          <input value={filters.user} onChange={(e) => setFilters((s) => ({ ...s, user: e.target.value }))} style={inputStyle} placeholder="User name/email" />
          <select value={filters.approvalState} onChange={(e) => setFilters((s) => ({ ...s, approvalState: e.target.value }))} style={inputStyle}>
            <option value="ALL">Approval State: All</option>
            <option value="UNREVIEWED">Unreviewed</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setFilters({ status: "ALL", date: "", resourceType: "ALL", resource: "", user: "", approvalState: "ALL" });
            }}
            style={{ ...buttonStyle, background: "#fff", color: "#0f172a", border: "1px solid #d1d5db" }}
          >
            Reset
          </button>
        </div>
        {error && <p style={{ margin: "10px 0 0", color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, marginTop: 12, padding: 0, overflowX: "auto", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1160 }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#334155", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {["Booked By", "Resource Name", "Resource Type", "Date", "Start Time", "End Time", "Status", "Requested On", "Actions"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 16, color: "#64748b" }}>No bookings found for the selected filters.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px", fontWeight: 700, color: "#0f172a" }}>{row.userName || "—"}</td>
                <td style={{ padding: "10px" }}>{row.resourceName || "—"}</td>
                <td style={{ padding: "10px" }}>{row.resourceType || "—"}</td>
                <td style={{ padding: "10px" }}>{fmtDate(row.bookingDate)}</td>
                <td style={{ padding: "10px" }}>{row.startTime || "—"}</td>
                <td style={{ padding: "10px" }}>{row.endTime || "—"}</td>
                <td style={{ padding: "10px" }}><span style={{ ...statusChip(row.status), display: "inline-flex", padding: "4px 9px", borderRadius: 999, fontWeight: 800, fontSize: 11 }}>{row.status || "PENDING"}</span></td>
                <td style={{ padding: "10px" }}>{fmtDateTime(row.createdAt)}</td>
                <td style={{ padding: "10px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setViewRow(row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#fff", border: "1px solid #d1d5db", color: "#0f172a", textAlign: "center" }}>View</button>
                    {canApprove(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => void handleApproveDirect(row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#16a34a", color: "#fff", textAlign: "center" }}>
                        Approve
                      </button>
                    )}
                    {canReject(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => openAction("reject", row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#dc2626", color: "#fff", textAlign: "center" }}>
                        Reject
                      </button>
                    )}
                    {canCancel(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => openAction("cancel", row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#111827", color: "#fff", textAlign: "center" }}>
                        Cancel
                      </button>
                    )}
                    {canDelete(row.status) && (
                      <button type="button" disabled={busyId === row.id} onClick={() => openAction("delete", row)} style={{ ...buttonStyle, ...actionControlStyle, background: "#dc2626", color: "#fff", textAlign: "center" }}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
            </>
          )}
        </div>
      </section>

      {viewRow && (
        <div role="dialog" aria-modal="true" onClick={() => setViewRow(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1300 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "760px", backgroundColor: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: "18px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 21, fontWeight: 800, color: "#111827" }}>Booking Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", color: "#334155", fontSize: 14 }}>
              <div><strong>Booking ID:</strong> {viewRow.id || "—"}</div>
              <div><strong>Booked By:</strong> {viewRow.userName || "—"}</div>
              <div><strong>Resource:</strong> {viewRow.resourceName || "—"}</div>
              <div><strong>Type:</strong> {viewRow.resourceType || "—"}</div>
              <div><strong>Date:</strong> {fmtDate(viewRow.bookingDate)}</div>
              <div><strong>Time:</strong> {viewRow.startTime || "—"} - {viewRow.endTime || "—"}</div>
              <div><strong>Status:</strong> {viewRow.status || "PENDING"}</div>
              <div><strong>Requested On:</strong> {fmtDateTime(viewRow.createdAt)}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Purpose:</strong> {viewRow.purpose || "—"}</div>
              <div><strong>Expected Attendees:</strong> {viewRow.expectedAttendees ?? "—"}</div>
              <div><strong>Updated On:</strong> {fmtDateTime(viewRow.updatedAt)}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>{cancellationOrRejectionLabel(viewRow)}:</strong> {cancellationOrRejectionReason(viewRow) || "—"}</div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Additional Notes:</strong> {viewRow.additionalNotes || "—"}</div>
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setViewRow(null)} style={{ ...buttonStyle, background: "#fff", border: "1px solid #d1d5db", color: "#0f172a" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {actionModal.row && (
        <div role="dialog" aria-modal="true" onClick={() => (busyId ? null : closeAction())} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1350 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.2)", padding: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#111827", textTransform: "capitalize" }}>{actionModal.type} Booking</h3>
            <p style={{ margin: "0 0 10px", color: "#334155", fontSize: 14 }}>
              {actionModal.type === "reject" && "Reject this booking request? Please provide a reason."}
              {actionModal.type === "cancel" && "Cancel this booking request? Please provide a reason."}
              {actionModal.type === "delete" && "Delete this cancelled booking permanently from database?"}
            </p>
            {actionModal.type !== "delete" && (
              <>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 700, color: "#111827", fontSize: 13 }}>
                  Reason (required)
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={actionModal.reason}
                  onChange={(e) => setActionModal((s) => ({ ...s, reason: e.target.value, error: "" }))}
                  style={{ width: "100%", borderRadius: 10, border: "1px solid #d1d5db", padding: "10px 12px", boxSizing: "border-box", resize: "vertical", fontSize: 14 }}
                />
              </>
            )}
            {actionModal.error && <p style={{ margin: "8px 0 0", color: "#b91c1c", fontWeight: 700, fontSize: 13 }}>{actionModal.error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={closeAction} disabled={!!busyId} style={{ ...buttonStyle, background: "#fff", border: "1px solid #d1d5db", color: "#0f172a" }}>Close</button>
              <button type="button" onClick={handleConfirmAction} disabled={busyId === actionModal.row.id} style={{ ...buttonStyle, background: "#FA8112", color: "#fff" }}>{busyId === actionModal.row.id ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
