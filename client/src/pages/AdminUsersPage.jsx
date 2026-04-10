import React, { useEffect, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import AdminUsersTable from "../components/admin/AdminUsersTable.jsx";
import { adminCreateUser } from "../api/adminUsers";
import { DEFAULT_TECHNICIAN_CATEGORY, TECHNICIAN_CATEGORIES, toApiTechnicianCategory } from "../constants/technicianCategories";
import PasswordInput from "../components/PasswordInput.jsx";
import { isValidProfilePhone, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../utils/profilePhone";
import { appFontFamily } from "../utils/appFont";

const BORDER_LIGHT_ORANGE = "#F5D4B0";

/** Class for scoped autofill override (style block in Add user modal). */
const ADD_USER_FORM_CLASS = "admin-add-user-form";

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

const requiredMarkStyle = { color: "#f0a8a8", fontWeight: 800, marginLeft: 2 };
const fieldErrorStyle = {
  margin: "6px 0 0",
  color: "#e57373",
  fontSize: 12,
  fontWeight: 600,
  fontStyle: "normal",
  lineHeight: 1.4,
  letterSpacing: "normal",
};

function AddUserFieldError({ message }) {
  if (!message) return null;
  return <p style={fieldErrorStyle} role="alert">{message}</p>;
}

function primaryCategoryForApi(selectedValues) {
  const picked = new Set(selectedValues);
  const ordered = TECHNICIAN_CATEGORIES.map((c) => c.value).filter((v) => picked.has(v));
  return ordered[0] || DEFAULT_TECHNICIAN_CATEGORY;
}
function allCategoriesForApi(selectedValues) {
  const picked = new Set(selectedValues);
  return TECHNICIAN_CATEGORIES.map((c) => c.value).filter((v) => picked.has(v)).map((v) => toApiTechnicianCategory(v));
}

function buildAddUserFieldErrors({ selectedRole, firstName, lastName, email, phoneNumber, password, selectedCategories }) {
  const e = {};
  const role = String(selectedRole || "").toUpperCase();
  if (role !== "ADMIN" && role !== "TECHNICIAN") e.role = "Select Admin or Technician.";
  if (!String(firstName || "").trim()) e.firstName = "First name is required.";
  if (!String(lastName || "").trim()) e.lastName = "Last name is required.";
  const em = String(email || "").trim();
  if (!em) e.email = "Work email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = "Enter a valid email address.";
  const pw = String(password || "");
  if (!pw) e.password = "Initial password is required.";
  else if (pw.length < 6) e.password = "Password must be at least 6 characters.";
  if (phoneNumber && !isValidProfilePhone(phoneNumber)) {
    e.phoneNumber = `Phone must be exactly ${PROFILE_PHONE_DIGITS} digits or leave empty.`;
  }
  if (role === "TECHNICIAN" && (!Array.isArray(selectedCategories) || selectedCategories.length === 0)) {
    e.categories = "Select at least one category.";
  }
  return e;
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
  const [addUserFieldErrors, setAddUserFieldErrors] = useState({});

  useEffect(() => {
    if (!addUserModalOpen) return;
    setSelectedRole("TECHNICIAN");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setSelectedCategories([]);
    setPassword("");
    setSubmitting(false);
    setAddUserFieldErrors({});
  }, [addUserModalOpen]);

  const clearAddUserErrors = () => setAddUserFieldErrors({});

  const handleRoleChange = (e) => {
    const v = e.target.value;
    setSelectedRole(v);
    setAddUserFieldErrors({});
    if (v === "ADMIN") setSelectedCategories([]);
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setAddUserFieldErrors({});
    const errs = buildAddUserFieldErrors({
      selectedRole,
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      selectedCategories,
    });
    if (Object.keys(errs).length) {
      setAddUserFieldErrors(errs);
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
      setUsersTableRev((n) => n + 1);
      setAddUserModalOpen(false);
    } catch (err) {
      setAddUserFieldErrors({ general: err?.message || "Could not create user." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout activeSection="users" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>User Management</h1>
        <AdminUsersTable refreshKey={usersTableRev} onOpenAddUser={() => setAddUserModalOpen(true)} onRequestRefresh={() => setUsersTableRev((n) => n + 1)} />

        {addUserModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-modal-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1001,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAddUserModalOpen(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "760px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: `1px solid ${BORDER_LIGHT_ORANGE}`,
                boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: `1px solid ${BORDER_LIGHT_ORANGE}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div id="add-user-modal-title" style={{ fontSize: "18px", fontWeight: 900, color: "#111827" }}>
                  Add user
                </div>
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, fontSize: "14px", cursor: "pointer", color: "#0f172a" }}
                >
                  Cancel
                </button>
              </div>
              <div style={{ padding: "18px 22px 22px" }}>
                <style>
                  {`
                    .${ADD_USER_FORM_CLASS} input:-webkit-autofill,
                    .${ADD_USER_FORM_CLASS} input:-webkit-autofill:hover,
                    .${ADD_USER_FORM_CLASS} input:-webkit-autofill:focus,
                    .${ADD_USER_FORM_CLASS} input:-webkit-autofill:active,
                    .${ADD_USER_FORM_CLASS} select:-webkit-autofill,
                    .${ADD_USER_FORM_CLASS} select:-webkit-autofill:hover,
                    .${ADD_USER_FORM_CLASS} select:-webkit-autofill:focus {
                      -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
                      box-shadow: 0 0 0 1000px #ffffff inset !important;
                      -webkit-text-fill-color: #222222 !important;
                      caret-color: #222222;
                    }
                    .${ADD_USER_FORM_CLASS} input:autofill,
                    .${ADD_USER_FORM_CLASS} select:autofill {
                      box-shadow: 0 0 0 1000px #ffffff inset;
                      -webkit-text-fill-color: #222222;
                    }
                  `}
                </style>
                <form className={ADD_USER_FORM_CLASS} onSubmit={handleSubmitUser} style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <label style={labelStyle}>
                      Role
                      <span style={requiredMarkStyle} aria-hidden="true">
                        *
                      </span>
                    </label>
                    <select value={selectedRole} onChange={handleRoleChange} style={selectFieldStyle} aria-label="Role for new user">
                      <option value="ADMIN">Admin</option>
                      <option value="TECHNICIAN">Technician</option>
                    </select>
                    <AddUserFieldError message={addUserFieldErrors.role} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <label style={labelStyle}>
                        First name
                        <span style={requiredMarkStyle} aria-hidden="true">
                          *
                        </span>
                      </label>
                      <input
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          clearAddUserErrors();
                        }}
                        style={inputStyle}
                        placeholder="First name"
                      />
                      <AddUserFieldError message={addUserFieldErrors.firstName} />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Last name
                        <span style={requiredMarkStyle} aria-hidden="true">
                          *
                        </span>
                      </label>
                      <input
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          clearAddUserErrors();
                        }}
                        style={inputStyle}
                        placeholder="Last name"
                      />
                      <AddUserFieldError message={addUserFieldErrors.lastName} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Work email
                      <span style={requiredMarkStyle} aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearAddUserErrors();
                      }}
                      style={inputStyle}
                      placeholder="example@gmail.com"
                    />
                    <AddUserFieldError message={addUserFieldErrors.email} />
                  </div>

                  {selectedRole === "TECHNICIAN" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={labelStyle}>
                          Categories
                          <span style={requiredMarkStyle} aria-hidden="true">
                            *
                          </span>
                        </label>
                        <select
                          multiple
                          value={selectedCategories}
                          onChange={(e) => {
                            setSelectedCategories(Array.from(e.target.selectedOptions, (o) => o.value));
                            clearAddUserErrors();
                          }}
                          style={{ ...selectFieldStyle, minHeight: "120px" }}
                          aria-label="Technician categories"
                        >
                          {TECHNICIAN_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <AddUserFieldError message={addUserFieldErrors.categories} />
                      </div>
                      <div>
                        <label style={labelStyle}>
                          Phone <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                        </label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={PROFILE_PHONE_DIGITS}
                          value={phoneNumber}
                          onChange={(e) => {
                            setPhoneNumber(sanitizeProfilePhoneInput(e.target.value));
                            clearAddUserErrors();
                          }}
                          style={inputStyle}
                          placeholder="0771234567"
                        />
                        <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>{PROFILE_PHONE_DIGITS} digits only, or leave empty.</p>
                        <AddUserFieldError message={addUserFieldErrors.phoneNumber} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={labelStyle}>
                        Phone <span style={{ fontWeight: 500, color: "#9ca3af" }}>(optional)</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={PROFILE_PHONE_DIGITS}
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(sanitizeProfilePhoneInput(e.target.value));
                          clearAddUserErrors();
                        }}
                        style={inputStyle}
                        placeholder="0771234567"
                      />
                      <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>{PROFILE_PHONE_DIGITS} digits only, or leave empty.</p>
                      <AddUserFieldError message={addUserFieldErrors.phoneNumber} />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>
                      Initial password
                      <span style={requiredMarkStyle} aria-hidden="true">
                        *
                      </span>
                    </label>
                    <PasswordInput
                      minLength={6}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearAddUserErrors();
                      }}
                      style={inputStyle}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                    />
                    <AddUserFieldError message={addUserFieldErrors.password} />
                  </div>

                  <AddUserFieldError message={addUserFieldErrors.general} />

                  <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.85 : 1 }}>
                    {submitting ? "Creating…" : selectedRole === "ADMIN" ? "Create admin" : "Create technician"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
