import React, { useEffect, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import AdminUsersTable from "../components/admin/AdminUsersTable.jsx";
import { adminCreateUser } from "../api/adminUsers";
import { DEFAULT_TECHNICIAN_CATEGORY, TECHNICIAN_CATEGORIES, toApiTechnicianCategory } from "../constants/technicianCategories";
import PasswordInput from "../components/PasswordInput.jsx";
import { isValidProfilePhone, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../utils/profilePhone";
import { appFontFamily } from "../utils/appFont";

const BORDER_LIGHT_ORANGE = "#F5D4B0";

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: `2px solid ${BORDER_LIGHT_ORANGE}`,
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "#FFFFFF",
  color: "#222222",
};
const selectFieldStyle = { ...inputStyle, cursor: "pointer", minHeight: "46px" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" };
const primaryBtn = { padding: "14px 22px", borderRadius: "10px", border: "none", backgroundColor: "#FA8112", color: "#FFFFFF", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%" };

function primaryCategoryForApi(selectedValues) {
  const picked = new Set(selectedValues);
  const ordered = TECHNICIAN_CATEGORIES.map((c) => c.value).filter((v) => picked.has(v));
  return ordered[0] || DEFAULT_TECHNICIAN_CATEGORY;
}
function allCategoriesForApi(selectedValues) {
  const picked = new Set(selectedValues);
  return TECHNICIAN_CATEGORIES.map((c) => c.value).filter((v) => picked.has(v)).map((v) => toApiTechnicianCategory(v));
}

export default function AdminUsersPage() {
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [usersTableRev, setUsersTableRev] = useState(0);
  const [selectedRole, setSelectedRole] = useState("TECHNICIAN");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!addUserModalOpen) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setSelectedCategories([]);
    setPassword("");
    setSubmitting(false);
    setMessage("");
    setError("");
  }, [addUserModalOpen]);

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (selectedRole === "TECHNICIAN" && selectedCategories.length === 0) {
      setError("Select at least one category.");
      return;
    }
    if (phoneNumber && !isValidProfilePhone(phoneNumber)) {
      setError("Phone number must be exactly 10 digits or leave empty.");
      return;
    }
    setSubmitting(true);
    try {
      await adminCreateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber || "",
        password,
        role: selectedRole,
        category: selectedRole === "TECHNICIAN" ? toApiTechnicianCategory(primaryCategoryForApi(selectedCategories)) : null,
        categories: selectedRole === "TECHNICIAN" ? allCategoriesForApi(selectedCategories) : [],
      });
      setMessage(`${selectedRole === "ADMIN" ? "Admin" : "Technician"} created.`);
      setUsersTableRev((n) => n + 1);
      setAddUserModalOpen(false);
    } catch (err) {
      setError(err?.message || "Could not create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout activeSection="users" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>User Management</h1>
        <AdminUsersTable
          refreshKey={usersTableRev}
          onAddTechnician={(role) => {
            setSelectedRole(role === "ADMIN" ? "ADMIN" : "TECHNICIAN");
            setAddUserModalOpen(true);
          }}
          onRequestRefresh={() => setUsersTableRev((n) => n + 1)}
        />

        {addUserModalOpen && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1001, backgroundColor: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }} onMouseDown={(e) => { if (e.target === e.currentTarget) setAddUserModalOpen(false); }}>
          <div style={{ width: "100%", maxWidth: "760px", backgroundColor: "#ffffff", borderRadius: "16px", border: `1px solid ${BORDER_LIGHT_ORANGE}`, boxShadow: "0 24px 90px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER_LIGHT_ORANGE}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>
                  {selectedRole === "ADMIN" ? "Add Admin User" : "Add Technician User"}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginTop: "2px" }}>
                  {selectedRole === "ADMIN"
                    ? "Create an ADMIN account (email/password)"
                    : "Create a TECHNICIAN account (email/password)"}
                </div>
              </div>
              <button type="button" onClick={() => setAddUserModalOpen(false)} style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, fontSize: "14px", cursor: "pointer", color: "#0f172a" }}>Cancel</button>
            </div>
            <div style={{ padding: "18px 22px 22px" }}>
              <form onSubmit={handleSubmitUser} style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div><label style={labelStyle}>First name</label><input required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} placeholder="First name" /></div>
                  <div><label style={labelStyle}>Last name</label><input required value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} placeholder="Last name" /></div>
                </div>
                <div><label style={labelStyle}>Work email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="example@gmail.com" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {selectedRole === "TECHNICIAN" ? (
                    <div>
                      <label style={labelStyle}>Categories</label>
                      <select multiple value={selectedCategories} onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, (o) => o.value))} style={{ ...selectFieldStyle, minHeight: "120px" }} aria-label="Technician categories">
                        {TECHNICIAN_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  ) : <div />}
                  <div>
                    <label style={labelStyle}>
                      Phone <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={PROFILE_PHONE_DIGITS}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(sanitizeProfilePhoneInput(e.target.value))}
                      style={inputStyle}
                      placeholder="0771234567"
                    />
                    <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
                      {PROFILE_PHONE_DIGITS} digits only, or leave empty.
                    </p>
                  </div>
                </div>
                <div><label style={labelStyle}>Initial password</label><PasswordInput required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder="At least 6 characters" autoComplete="new-password" /></div>
                {error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px", fontWeight: 600 }} role="alert">{error}</p> : null}
                {message ? <p style={{ margin: 0, color: "#15803d", fontSize: "14px", fontWeight: 600 }} role="status">{message}</p> : null}
                <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.85 : 1 }}>{submitting ? "Creating…" : "Create user"}</button>
              </form>
            </div>
          </div>
        </div>
        )}
      </div>
    </AdminLayout>
  );
}

