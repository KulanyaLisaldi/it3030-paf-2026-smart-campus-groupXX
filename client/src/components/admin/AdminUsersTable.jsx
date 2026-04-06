import React, { useEffect, useMemo, useState } from "react";
import {
  adminDeleteUser,
  adminSetUserStatus,
  adminUpdateUserProfile,
  getAdminUsers,
} from "../../api/adminUsers";
import { readCampusUser } from "../../utils/campusUserStorage";
import { isValidProfilePhone, phoneFromServer, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../../utils/profilePhone";

const pageCardStyle = {
  maxWidth: "100%",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
  padding: "18px",
  boxSizing: "border-box",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "13px",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 10px",
  fontWeight: 900,
  color: "#0f172a",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 10px",
  borderBottom: "1px solid #eef2f7",
  color: "#334155",
  verticalAlign: "top",
};

const rowStyle = (isHovered) => ({
  backgroundColor: isHovered ? "#f8fafc" : "#ffffff",
  transition: "background-color 0.16s ease",
});
const PAGE_SIZE = 10;

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
  if (variant === "danger") {
    return { ...base, border: "1px solid #fecaca", color: "#b91c1c", background: "#fff" };
  }
  if (variant === "primary") {
    return { ...base, border: "1px solid rgba(250,129,18,0.35)", color: "#9a3412", background: "rgba(250,129,18,0.10)" };
  }
  return { ...base, border: "1px solid #e5e7eb", color: "#0f172a" };
};

const iconBtnStyle = (variant = "neutral") => ({
  ...smallBtnStyle(variant),
  width: "34px",
  height: "34px",
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DisableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 16l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EnableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7l1 12h8l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function roleBadgeStyle(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") {
    return { background: "#dbeafe", border: "1px solid #93c5fd", color: "#1d4ed8" };
  }
  if (r === "TECHNICIAN") {
    return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  }
  return { background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" };
}

function statusBadgeStyle(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DISABLED" || s === "SUSPENDED") {
    return { background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" };
  }
  return { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
}

function Badge({ text, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 800,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {text}
    </span>
  );
}

export default function AdminUsersTable({ onAddTechnician, refreshKey = 0, onRequestRefresh }) {
  const currentUserId = useMemo(() => {
    const me = readCampusUser();
    return String(me?.id || "").trim();
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsUser, setDetailsUser] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addUserMenuOpen, setAddUserMenuOpen] = useState(false);

  const modalInputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#FFFFFF",
    color: "#0f172a",
  };

  useEffect(() => {
    if (!editPanelOpen || !selectedUser) return;
    setEditFirstName(selectedUser.firstName || "");
    setEditLastName(selectedUser.lastName || "");
    setEditPhoneNumber(phoneFromServer(selectedUser.phoneNumber));
    setActionError("");
  }, [editPanelOpen, selectedUser]);

  const refresh = () => {
    if (typeof onRequestRefresh === "function") onRequestRefresh();
  };

  const handleEditSave = async () => {
    if (!selectedUser) return;
    const phoneDigits = editPhoneNumber || "";
    if (phoneDigits && !isValidProfilePhone(phoneDigits)) {
      setActionError("Phone number must be exactly 10 digits or left empty.");
      return;
    }
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await adminUpdateUserProfile(selectedUser.userId, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: phoneDigits ? phoneDigits : null,
      });
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
      setDetailsUser((prev) => (prev && prev.userId === updated.userId ? updated : prev));
      setSelectedUser(updated);
      setEditPanelOpen(false);
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to update user.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleDisabled = async (u) => {
    if (!u) return;
    if ((u.role || "").toUpperCase() === "ADMIN") {
      setActionError("Admin accounts cannot be deactivated.");
      return;
    }
    if (currentUserId && u.userId === currentUserId) {
      setActionError("You cannot disable your own account.");
      return;
    }
    const currentlyDisabled = (u.accountStatus || "") === "Disabled";
    const nextDisabled = !currentlyDisabled;
    const ok = window.confirm(
      currentlyDisabled
        ? "Enable this account?"
        : "Disable this account? It will not be able to sign in."
    );
    if (!ok) return;

    setActionBusy(true);
    setActionError("");
    try {
      const updated = await adminSetUserStatus(u.userId, { disabled: nextDisabled });
      setUsers((prev) => prev.map((row) => (row.userId === updated.userId ? updated : row)));
      setDetailsUser((prev) => (prev && prev.userId === updated.userId ? updated : prev));
      setSelectedUser((prev) => (prev && prev.userId === updated.userId ? updated : prev));
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to update account status.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!u) return;
    if ((u.role || "").toUpperCase() === "ADMIN") {
      setActionError("Admin accounts cannot be deleted.");
      return;
    }
    const ok = window.confirm(`Delete ${u.name || u.email || "this user"} permanently?`);
    if (!ok) return;
    setActionBusy(true);
    setActionError("");
    try {
      await adminDeleteUser(u.userId);
      setDetailsUser((prev) => (prev && prev.userId === u.userId ? null : prev));
      setEditPanelOpen(false);
      setSelectedUser((prev) => (prev && prev.userId === u.userId ? null : prev));
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to delete user.");
    } finally {
      setActionBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (users || []).filter((u) => {
      if (roleFilter !== "ALL" && (u.role || "") !== roleFilter) return false;
      if (providerFilter !== "ALL" && (u.provider || "") !== providerFilter) return false;
      if (statusFilter !== "ALL" && (u.accountStatus || "") !== statusFilter) return false;

      if (!q) return true;
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, search, roleFilter, providerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, providerFilter, statusFilter, refreshKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div style={pageCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#14213D", marginBottom: 4 }}>All Users</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) 170px 170px 170px 150px",
          gap: 12,
          alignItems: "end",
          marginBottom: 10,
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          >
            <option value="ALL">All</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TECHNICIAN">TECHNICIAN</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Provider</label>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          >
            <option value="ALL">All</option>
            <option value="Google OAuth">Google OAuth</option>
            <option value="Email">Email</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Account Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              outline: "none",
              color: "#0f172a",
              boxSizing: "border-box",
            }}
          >
            <option value="ALL">All</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 6 }}>Add User</label>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setAddUserMenuOpen((v) => !v)}
              style={{ ...smallBtnStyle("neutral"), width: "100%", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              aria-haspopup="menu"
              aria-expanded={addUserMenuOpen}
            >
              <span>Add User</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{addUserMenuOpen ? "▲" : "▼"}</span>
            </button>
            {addUserMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddUserMenuOpen(false);
                    onAddTechnician?.("ADMIN");
                  }}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                >
                  ADMIN
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddUserMenuOpen(false);
                    onAddTechnician?.("TECHNICIAN");
                  }}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                >
                  TECHNICIAN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }} />

      {loading && <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Loading users…</p>}
      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 900 }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>User ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Account Status</th>
                  <th style={thStyle}>Provider</th>
                  <th style={thStyle}>Created Date</th>
                  <th style={thStyle}>Last Login</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td style={tdStyle} colSpan={10}>
                      No users found.
                    </td>
                  </tr>
                )}
                {pagedRows.map((u) => (
                  <tr
                    key={u.userId}
                    style={rowStyle(hoveredRowId === u.userId)}
                    onMouseEnter={() => setHoveredRowId(u.userId)}
                    onMouseLeave={() => setHoveredRowId("")}
                  >
                    <td style={tdStyle}>{u.userId}</td>
                    <td style={tdStyle}>{u.name || "—"}</td>
                    <td style={tdStyle}>{u.email || "—"}</td>
                    <td style={tdStyle}>
                      <Badge text={u.role || "USER"} style={roleBadgeStyle(u.role)} />
                    </td>
                    <td style={tdStyle}>
                      <Badge
                        text={(u.accountStatus || "").toUpperCase() === "DISABLED" ? "Suspended" : "Active"}
                        style={statusBadgeStyle(u.accountStatus)}
                      />
                    </td>
                    <td style={tdStyle}>{u.provider || "—"}</td>
                    <td style={tdStyle}>{formatDate(u.createdDate) || "—"}</td>
                    <td style={tdStyle}>{formatDate(u.lastLogin) || "—"}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={iconBtnStyle("neutral")}
                          disabled={actionBusy}
                          title="View details"
                          aria-label="View details"
                          onClick={() => {
                            setDetailsUser(u);
                          }}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          style={((u.accountStatus || "") === "Disabled") ? iconBtnStyle("primary") : iconBtnStyle("danger")}
                          disabled={actionBusy || (u.role || "").toUpperCase() === "ADMIN" || (currentUserId && u.userId === currentUserId)}
                          title={((u.role || "").toUpperCase() === "ADMIN")
                            ? "Admin account cannot be deactivated"
                            : (currentUserId && u.userId === currentUserId)
                            ? "You cannot disable your own account"
                            : ((u.accountStatus || "") === "Disabled" ? "Enable account" : "Disable account")}
                          aria-label={((u.role || "").toUpperCase() === "ADMIN")
                            ? "Admin deactivate not allowed"
                            : (currentUserId && u.userId === currentUserId)
                            ? "Self disable not allowed"
                            : ((u.accountStatus || "") === "Disabled" ? "Enable account" : "Disable account")}
                          onClick={() => handleToggleDisabled(u)}
                        >
                          {(u.accountStatus || "") === "Disabled" ? <EnableIcon /> : <DisableIcon />}
                        </button>
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
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Showing {(safePage - 1) * PAGE_SIZE + 1}-
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} users • {PAGE_SIZE} per page
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{ ...smallBtnStyle("neutral"), opacity: safePage <= 1 ? 0.5 : 1 }}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-current={safePage === page ? "page" : undefined}
                    style={{
                      ...smallBtnStyle(safePage === page ? "primary" : "neutral"),
                      minWidth: 34,
                      fontWeight: 900,
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{ ...smallBtnStyle("neutral"), opacity: safePage >= totalPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {detailsUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1001,
            backgroundColor: "rgba(15, 23, 42, 0.30)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            paddingTop: "34px",
            paddingBottom: "34px",
            paddingRight: "20px",
            boxSizing: "border-box",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailsUser(null);
          }}
        >
          <div style={{ display: "flex", maxHeight: "calc(100vh - 68px)", justifyContent: "flex-end", gap: 12, alignItems: "flex-start" }}>
            {editPanelOpen && selectedUser && (
              <div
                style={{
                  width: "min(420px, calc(100vw - 40px))",
                  maxHeight: "calc(100vh - 68px)",
                  background: "rgba(255, 255, 255, 0.90)",
                  backdropFilter: "blur(8px)",
                  borderLeft: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  boxShadow: "-8px 12px 34px rgba(15, 23, 42, 0.16)",
                  padding: "20px 18px 18px",
                  boxSizing: "border-box",
                  overflowY: "auto",
                  animation: "adminUserDetailsSlideIn 0.2s ease-out",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Edit User</div>
                  <button
                    type="button"
                    onClick={() => setEditPanelOpen(false)}
                    style={{ ...iconBtnStyle("neutral"), width: 30, height: 30 }}
                    aria-label="Close edit panel"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditSave();
                  }}
                  style={{ marginTop: 14, display: "grid", gap: 14 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        First name
                      </label>
                      <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} style={modalInputStyle} placeholder="First name" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                        Last name
                      </label>
                      <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} style={modalInputStyle} placeholder="Last name" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                      Phone number <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={PROFILE_PHONE_DIGITS}
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(sanitizeProfilePhoneInput(e.target.value))}
                      style={modalInputStyle}
                      placeholder="0771234567"
                    />
                    <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                      Optional. {PROFILE_PHONE_DIGITS} digits only.
                    </p>
                  </div>

                  {actionError && (
                    <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 900 }}>{actionError}</p>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button type="button" onClick={() => setEditPanelOpen(false)} style={smallBtnStyle("neutral")}>Cancel</button>
                    <button type="submit" disabled={actionBusy} style={{ ...smallBtnStyle("primary"), opacity: actionBusy ? 0.85 : 1 }}>
                      {actionBusy ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div
              style={{
                width: "min(420px, calc(100vw - 40px))",
                maxHeight: "calc(100vh - 68px)",
                background: "rgba(255, 255, 255, 0.90)",
                backdropFilter: "blur(8px)",
                borderLeft: "1px solid #e5e7eb",
                borderRadius: "18px",
                boxShadow: "-8px 12px 34px rgba(15, 23, 42, 0.18)",
                padding: "20px 18px 18px",
                boxSizing: "border-box",
                overflowY: "auto",
                animation: "adminUserDetailsSlideIn 0.2s ease-out",
              }}
            >
            <style>{`@keyframes adminUserDetailsSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>User Details</div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsUser(null)}
                style={{ ...iconBtnStyle("neutral"), width: 30, height: 30 }}
                aria-label="Close details panel"
              >
                <CloseIcon />
              </button>
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#475569",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {String(detailsUser.name || detailsUser.email || "U").trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{detailsUser.name || "—"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <Badge text={detailsUser.role || "USER"} style={roleBadgeStyle(detailsUser.role)} />
                  <Badge
                    text={(detailsUser.accountStatus || "").toUpperCase() === "DISABLED" ? "Suspended" : "Active"}
                    style={statusBadgeStyle(detailsUser.accountStatus)}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 10,
                background: "rgba(255,255,255,0.75)",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div><strong style={{ color: "#0f172a" }}>Email:</strong> {detailsUser.email || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>Provider:</strong> {detailsUser.provider || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>Created date:</strong> {formatDate(detailsUser.createdDate) || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>Last login:</strong> {formatDate(detailsUser.lastLogin) || "—"}</div>
              <div><strong style={{ color: "#0f172a" }}>User ID:</strong> {detailsUser.userId || "—"}</div>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                style={smallBtnStyle("primary")}
                onClick={() => {
                  setSelectedUser(detailsUser);
                  setEditPanelOpen(true);
                }}
              >
                Edit User
              </button>
              <button
                type="button"
                style={smallBtnStyle((detailsUser.accountStatus || "") === "Disabled" ? "primary" : "danger")}
                disabled={actionBusy || (detailsUser.role || "").toUpperCase() === "ADMIN" || (currentUserId && detailsUser.userId === currentUserId)}
                title={(detailsUser.role || "").toUpperCase() === "ADMIN" ? "Admin account cannot be deactivated" : "Toggle account status"}
                onClick={() => handleToggleDisabled(detailsUser)}
              >
                {(detailsUser.accountStatus || "") === "Disabled" ? "Activate" : "Deactivate"}
              </button>
              {(detailsUser.role || "").toUpperCase() !== "ADMIN" ? (
                <button
                  type="button"
                  style={smallBtnStyle("danger")}
                  disabled={actionBusy}
                  onClick={() => handleDeleteUser(detailsUser)}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <DeleteIcon />
                    Delete
                  </span>
                </button>
              ) : null}
            </div>
            {actionError && <p style={{ marginTop: 10, marginBottom: 0, color: "#b91c1c", fontSize: 13, fontWeight: 800 }}>{actionError}</p>}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

