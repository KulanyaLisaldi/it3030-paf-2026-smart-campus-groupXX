import React, { useEffect, useMemo, useState } from "react";
import { getAdminUsers } from "../../api/adminUsers";

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

export default function AdminUsersTable({ onAddTechnician, refreshKey = 0 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
                    <td style={tdStyle} colSpan={9}>
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
                          style={smallBtnStyle("neutral")}
                          onClick={() => window.alert("Edit user - not implemented yet")}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          style={smallBtnStyle("neutral")}
                          onClick={() => window.alert("Change role - not implemented yet")}
                        >
                          Role Change
                        </button>
                        <button
                          type="button"
                          style={smallBtnStyle("danger")}
                          onClick={() => window.alert("Disable user - not implemented yet")}
                        >
                          Disable
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
    </div>
  );
}

