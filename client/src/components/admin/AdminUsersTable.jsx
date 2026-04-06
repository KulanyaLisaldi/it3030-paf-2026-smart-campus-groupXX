import React, { useEffect, useMemo, useState } from "react";
import {
  adminChangeUserRole,
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

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 7h10M8 12h6M8 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="17" r="1" fill="currentColor" />
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

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addUserMenuOpen, setAddUserMenuOpen] = useState(false);

  const [roleDraft, setRoleDraft] = useState("USER");

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

  const modalSelectStyle = { ...modalInputStyle, cursor: "pointer", minHeight: "46px" };

  const closeModals = () => {
    setEditModalOpen(false);
    setRoleModalOpen(false);
    setSelectedUser(null);
    setActionBusy(false);
    setActionError("");
  };

  useEffect(() => {
    if (!editModalOpen || !selectedUser) return;
    setEditFirstName(selectedUser.firstName || "");
    setEditLastName(selectedUser.lastName || "");
    setEditPhoneNumber(phoneFromServer(selectedUser.phoneNumber));
    setActionError("");
  }, [editModalOpen, selectedUser]);

  useEffect(() => {
    if (!roleModalOpen || !selectedUser) return;
    setRoleDraft(selectedUser.role || "USER");
    setActionError("");
  }, [roleModalOpen, selectedUser]);

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
      await adminUpdateUserProfile(selectedUser.userId, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: phoneDigits ? phoneDigits : null,
      });
      closeModals();
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to update user.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRoleSave = async () => {
    if (!selectedUser) return;
    setActionBusy(true);
    setActionError("");
    try {
      await adminChangeUserRole(selectedUser.userId, { role: roleDraft });
      closeModals();
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to change role.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleDisabled = async (u) => {
    if (!u) return;
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
      await adminSetUserStatus(u.userId, { disabled: nextDisabled });
      refresh();
    } catch (e) {
      setActionError(e.message || "Failed to update account status.");
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
                          title="Edit profile"
                          aria-label="Edit profile"
                          onClick={() => {
                            setSelectedUser(u);
                            setEditModalOpen(true);
                          }}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          style={iconBtnStyle("neutral")}
                          disabled={actionBusy}
                          title="Role change"
                          aria-label="Role change"
                          onClick={() => {
                            setSelectedUser(u);
                            setRoleModalOpen(true);
                          }}
                        >
                          <RoleIcon />
                        </button>
                        <button
                          type="button"
                          style={((u.accountStatus || "") === "Disabled") ? iconBtnStyle("primary") : iconBtnStyle("danger")}
                          disabled={actionBusy || (currentUserId && u.userId === currentUserId)}
                          title={(currentUserId && u.userId === currentUserId)
                            ? "You cannot disable your own account"
                            : ((u.accountStatus || "") === "Disabled" ? "Enable account" : "Disable account")}
                          aria-label={(currentUserId && u.userId === currentUserId)
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

      {editModalOpen && selectedUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1002,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModals();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Edit profile</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>
                  {selectedUser.email || selectedUser.userId}
                </div>
              </div>
              <button
                type="button"
                onClick={closeModals}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 900,
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditSave();
              }}
              style={{ padding: "18px 22px 22px", display: "grid", gap: "16px" }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                    First name
                  </label>
                  <input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    style={modalInputStyle}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    style={modalInputStyle}
                    placeholder="Last name"
                  />
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

              <button type="submit" disabled={actionBusy} style={{ ...smallBtnStyle("primary"), opacity: actionBusy ? 0.85 : 1 }}>
                {actionBusy ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {roleModalOpen && selectedUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1002,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModals();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>Role change</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>
                  {selectedUser.email || selectedUser.userId}
                </div>
              </div>
              <button
                type="button"
                onClick={closeModals}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontWeight: 900,
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRoleSave();
              }}
              style={{ padding: "18px 22px 22px", display: "grid", gap: "16px" }}
            >
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 900, color: "#475569", marginBottom: 6 }}>
                  New role
                </label>
                <select value={roleDraft} onChange={(e) => setRoleDraft(e.target.value)} style={modalSelectStyle}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                </select>
              </div>

              {actionError && (
                <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 900 }}>{actionError}</p>
              )}

              <button type="submit" disabled={actionBusy} style={{ ...smallBtnStyle("primary"), opacity: actionBusy ? 0.85 : 1 }}>
                {actionBusy ? "Updating..." : "Update role"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

