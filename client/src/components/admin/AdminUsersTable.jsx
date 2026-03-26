import React, { useEffect, useMemo, useState } from "react";
import {
  adminChangeUserRole,
  adminSetUserStatus,
  adminUpdateUserProfile,
  getAdminUsers,
} from "../../api/adminUsers";

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

export default function AdminUsersTable({ onAddTechnician, refreshKey = 0, onRequestRefresh }) {
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
    setEditPhoneNumber(selectedUser.phoneNumber || "");
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
    setActionBusy(true);
    setActionError("");
    try {
      await adminUpdateUserProfile(selectedUser.userId, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: editPhoneNumber.trim() ? editPhoneNumber.trim() : null,
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

  return (
    <div style={pageCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#14213D", marginBottom: 4 }}>All Users</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Search, filter, and manage staff accounts.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={onAddTechnician} style={smallBtnStyle("primary")}>
            Add technician
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 180px 180px", gap: 12, alignItems: "end", marginBottom: 14 }}>
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
      </div>

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
                {filtered.map((u) => (
                  <tr key={u.userId}>
                    <td style={tdStyle}>{u.userId}</td>
                    <td style={tdStyle}>{u.name || "—"}</td>
                    <td style={tdStyle}>{u.email || "—"}</td>
                    <td style={tdStyle}>{u.role || "—"}</td>
                    <td style={tdStyle}>{u.accountStatus || "Active"}</td>
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
                          disabled={actionBusy}
                          title={(u.accountStatus || "") === "Disabled" ? "Enable account" : "Disable account"}
                          aria-label={(u.accountStatus || "") === "Disabled" ? "Enable account" : "Disable account"}
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
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  style={modalInputStyle}
                  placeholder="+94 77 000 0000"
                />
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

