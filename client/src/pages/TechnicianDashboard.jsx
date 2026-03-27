import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTechnician, listTechnicians } from "../api/adminTechnicians";
import { DEFAULT_TECHNICIAN_CATEGORY, TECHNICIAN_CATEGORIES } from "../constants/technicianCategories";
import { removeProfileAvatar, updateProfilePhone, uploadProfileAvatar } from "../api/auth";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../utils/campusUserStorage";
import PasswordInput from "../components/PasswordInput.jsx";

const PHONE_PATTERN = /^[0-9+\-()\s]{7,20}$/;

function isValidPhone(value) {
  const t = (value || "").trim();
  return t.length > 0 && PHONE_PATTERN.test(t);
}

const pageStyleBase = {
  minHeight: "100vh",
  backgroundColor: "#FFFFFF",
  padding: "28px 16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
};

const containerStyle = {
  width: "100%",
  maxWidth: "720px",
  backgroundColor: "#FFFFFF",
  borderRadius: "14px",
  border: "1px solid #F5E7C6",
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.08)",
  padding: "28px",
  flexShrink: 0,
};

const technicianPageOuterStyle = {
  ...pageStyleBase,
  justifyContent: "flex-start",
  alignItems: "stretch",
  width: "100%",
  padding: "20px clamp(16px, 4vw, 32px)",
};

const technicianCardStyle = {
  ...containerStyle,
  maxWidth: "min(960px, 100%)",
  width: "100%",
  margin: "0 auto",
  minHeight: "calc(100vh - 40px)",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
};

const selectStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#222222",
  backgroundColor: "#FFFFFF",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "8px",
};

function getStoredUser() {
  try {
    const raw = localStorage.getItem("smartCampusUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function technicianCategoryLabel(value) {
  if (value == null || value === "") return "—";
  const found = TECHNICIAN_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : String(value);
}

function userDisplayInitial(user) {
  if (!user) return "?";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "T";
}

function TechnicianWorkspace() {
  const navigate = useNavigate();
  const [userRev, setUserRev] = useState(0);
  const techUser = useMemo(() => readCampusUser(), [userRev]);
  const name = (techUser?.firstName || techUser?.email || "Technician").trim();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileRef = useRef(null);
  const avatarFileRef = useRef(null);

  const [phoneDraft, setPhoneDraft] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");

  useEffect(() => {
    const onUserUpdated = () => setUserRev((n) => n + 1);
    window.addEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
    return () => window.removeEventListener(CAMPUS_USER_UPDATED, onUserUpdated);
  }, []);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (profileRef.current && !profileRef.current.contains(t)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!profileModalOpen) return;
    setPhoneDraft((techUser?.phoneNumber || "").trim());
    setSaveState({ busy: false, message: "", error: "" });
    setAvatarBusy(false);
    setAvatarRemoveBusy(false);
    setAvatarError("");
    setAvatarSuccess("");
  }, [profileModalOpen, techUser]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    persistCampusUser(null);
    localStorage.removeItem("smartCampusAuthToken");
    navigate("/signin", { replace: true });
  };

  const serverPhone = (techUser?.phoneNumber || "").trim();
  const canSavePhone = useMemo(() => {
    const draft = phoneDraft.trim();
    if (!isValidPhone(draft)) return false;
    return draft !== serverPhone;
  }, [phoneDraft, serverPhone]);

  const triggerStyle = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: techUser?.profileImageUrl ? "#ffffff" : "#475569",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 16,
    overflow: "hidden",
    boxShadow: profileMenuOpen ? "0 0 0 2px #FA8112" : "0 0 0 1px #e5e7eb",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    width: "min(280px, calc(100vw - 48px))",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
    padding: 14,
    zIndex: 50,
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
            marginBottom: 20,
            padding: "16px 18px",
            backgroundColor: "#FAF3E1",
            border: "1px solid #F5E7C6",
            borderLeft: "4px solid #FA8112",
            borderRadius: "12px",
            boxSizing: "border-box",
            boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 0 0", lineHeight: 1.45 }}>
              <span style={{ fontSize: "clamp(17px, 2.1vw, 22px)", fontWeight: 800, color: "#14213D" }}>
                Welcome back, {name}.
              </span>{" "}
              <span style={{ fontSize: "clamp(15px, 1.7vw, 18px)", fontWeight: 600, color: "#4b5563" }}>
                Ticket assignment and maintenance workflows can plug in here.
              </span>
            </p>
          </div>

          <div style={{ position: "relative", flexShrink: 0 }} ref={profileRef}>
          <button
            type="button"
            style={triggerStyle}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((o) => !o)}
          >
            {techUser?.profileImageUrl ? (
              <img
                src={techUser.profileImageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              userDisplayInitial(techUser)
            )}
          </button>

          {profileMenuOpen && (
            <div role="menu" style={dropdownStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: techUser?.profileImageUrl ? "#f1f5f9" : "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {techUser?.profileImageUrl ? (
                    <img
                      src={techUser.profileImageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ color: "#fff", fontWeight: 800 }}>{userDisplayInitial(techUser)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
                    {(techUser?.firstName || "").trim() || "Technician"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", wordBreak: "break-word" }}>{techUser?.email || "—"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0f172a",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  My profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0f172a",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            marginBottom: 0,
            border: "1px solid #F5E7C6",
            borderRadius: "12px",
            padding: "clamp(18px, 3vw, 24px)",
            backgroundColor: "#FAF3E1",
            boxSizing: "border-box",
            boxShadow: "0 6px 14px rgba(20, 33, 61, 0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "clamp(16px, 3vw, 24px)",
              alignItems: "start",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "clamp(72px, 11vw, 88px)",
                height: "clamp(72px, 11vw, 88px)",
                borderRadius: "50%",
                backgroundColor: techUser?.profileImageUrl ? "#fff" : "#475569",
                border: "1px solid #F5E7C6",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {techUser?.profileImageUrl ? (
                <img src={techUser.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(20px, 4vw, 26px)" }}>{userDisplayInitial(techUser)}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#14213D",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "14px",
                }}
              >
                Your personal details
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "14px 24px",
                  width: "100%",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Full name</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#222222", wordBreak: "break-word" }}>
                    {`${(techUser?.firstName || "").trim()} ${(techUser?.lastName || "").trim()}`.trim() || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Email</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#222222", wordBreak: "break-word" }}>{techUser?.email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Specialty</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#222222" }}>
                    {technicianCategoryLabel(techUser?.technicianCategory)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "4px" }}>Phone</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#222222" }}>{(techUser?.phoneNumber || "").trim() || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 12 }} aria-hidden />
      </div>

      {profileModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProfileModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              backgroundColor: "#fff",
              borderRadius: 16,
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
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>My profile</div>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700, marginTop: 2 }}>Personal info</div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#111827",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {techUser?.profileImageUrl ? (
                    <img
                      src={techUser.profileImageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 42, fontWeight: 900, color: "#6b7280" }}>{userDisplayInitial(techUser)}</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 280 }}>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setAvatarError("");
                      setAvatarSuccess("");
                      setAvatarBusy(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const updated = await uploadProfileAvatar(fd);
                        persistCampusUser(updated);
                        setAvatarSuccess("Profile photo updated.");
                      } catch (err) {
                        setAvatarError(err?.message || "Upload failed");
                      } finally {
                        setAvatarBusy(false);
                      }
                    }}
                  />

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={avatarBusy || avatarRemoveBusy}
                      onClick={() => avatarFileRef.current?.click()}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        background: "#ffffff",
                        fontWeight: 900,
                        fontSize: 14,
                        cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                        color: "#111827",
                      }}
                    >
                      {avatarBusy ? "Saving…" : techUser?.profileImageUrl ? "Change photo" : "Upload photo"}
                    </button>

                    {techUser?.profileImageUrl && (
                      <button
                        type="button"
                        disabled={avatarBusy || avatarRemoveBusy}
                        onClick={async () => {
                          const ok = window.confirm("Remove your profile photo from Smart Campus?");
                          if (!ok) return;
                          setAvatarError("");
                          setAvatarSuccess("");
                          setAvatarRemoveBusy(true);
                          try {
                            const updated = await removeProfileAvatar();
                            persistCampusUser(updated);
                            setAvatarSuccess("Profile photo removed.");
                          } catch (err) {
                            setAvatarError(err?.message || "Could not remove photo");
                          } finally {
                            setAvatarRemoveBusy(false);
                          }
                        }}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #fecaca",
                          background: "#ffffff",
                          fontWeight: 900,
                          fontSize: 14,
                          cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer",
                          color: "#b91c1c",
                        }}
                      >
                        {avatarRemoveBusy ? "Removing…" : "Remove photo"}
                      </button>
                    )}
                  </div>

                  {avatarSuccess && <div style={{ marginTop: 10, color: "#059669", fontWeight: 800 }}>{avatarSuccess}</div>}
                  {avatarError && <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 800 }}>{avatarError}</div>}
                </div>
              </div>

              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={techUser?.email || ""}
                    readOnly
                    disabled
                    style={{ ...selectStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => {
                      setPhoneDraft(e.target.value);
                      setSaveState((s) => ({ ...s, message: "", error: "" }));
                    }}
                    style={selectStyle}
                    placeholder="+94 77 123 4567"
                    autoComplete="tel"
                  />
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, fontWeight: 700 }}>
                    7–20 characters: digits, spaces, +, -, ( )
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    First name
                  </label>
                  <input
                    type="text"
                    value={techUser?.firstName || ""}
                    readOnly
                    disabled
                    style={{ ...selectStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    type="text"
                    value={techUser?.lastName || ""}
                    readOnly
                    disabled
                    style={{ ...selectStyle, backgroundColor: "#f3f4f6", color: "#374151" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 14, alignItems: "center" }}>
                {saveState.message && <span style={{ color: "#059669", fontWeight: 900 }}>{saveState.message}</span>}
                {saveState.error && <span style={{ color: "#b91c1c", fontWeight: 900 }}>{saveState.error}</span>}

                <button
                  type="button"
                  disabled={!canSavePhone || saveState.busy}
                  onClick={async () => {
                    if (!canSavePhone) return;
                    setSaveState({ busy: true, message: "", error: "" });
                    try {
                      const updated = await updateProfilePhone({ phoneNumber: phoneDraft.trim() });
                      persistCampusUser(updated);
                      setSaveState({ busy: false, message: "Changes saved.", error: "" });
                    } catch (err) {
                      setSaveState({ busy: false, message: "", error: err?.message || "Save failed" });
                    }
                  }}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: canSavePhone && !saveState.busy ? "#FA8112" : "#d1d5db",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: canSavePhone && !saveState.busy ? "pointer" : "not-allowed",
                  }}
                >
                  {saveState.busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AdminTechnicianForm() {
  const navigate = useNavigate();
  const [techFirstName, setTechFirstName] = useState("");
  const [techLastName, setTechLastName] = useState("");
  const [techEmail, setTechEmail] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [techCategory, setTechCategory] = useState(DEFAULT_TECHNICIAN_CATEGORY);
  const [techPassword, setTechPassword] = useState("");
  const [techSubmitting, setTechSubmitting] = useState(false);
  const [techMessage, setTechMessage] = useState("");
  const [techError, setTechError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [techListLoading, setTechListLoading] = useState(true);
  const [techListError, setTechListError] = useState("");

  const loadTechnicianRoster = async () => {
    setTechListLoading(true);
    setTechListError("");
    try {
      const data = await listTechnicians();
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (err) {
      setTechListError(err?.message || "Could not load technicians.");
      setTechnicians([]);
    } finally {
      setTechListLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicianRoster();
  }, []);

  const submitAddTechnician = async (e) => {
    e.preventDefault();
    setTechMessage("");
    setTechError("");
    setTechSubmitting(true);
    try {
      await createTechnician({
        firstName: techFirstName.trim(),
        lastName: techLastName.trim(),
        email: techEmail.trim(),
        phoneNumber: techPhone.trim(),
        password: techPassword,
        category: techCategory,
      });
      setTechMessage("Technician created. They can sign in with email and password.");
      setTechFirstName("");
      setTechLastName("");
      setTechEmail("");
      setTechPhone("");
      setTechCategory(DEFAULT_TECHNICIAN_CATEGORY);
      setTechPassword("");
      loadTechnicianRoster();
    } catch (err) {
      setTechError(err?.message || "Could not create technician.");
    } finally {
      setTechSubmitting(false);
    }
  };

  return (
    <>
      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "12px",
          backgroundColor: "#FAF3E1",
          marginBottom: "18px",
        }}
      >
        <div style={{ color: "#222222", fontSize: "22px", fontWeight: 800, lineHeight: 1.1 }}>Welcome back, Admin</div>
        <div style={{ color: "#6b7280", fontSize: "13px", fontWeight: 600, marginTop: "6px" }}>
          Ticket analytics dashboard with live operational metrics
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/adminticket")}
        style={{
          marginBottom: "16px",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #F5E7C6",
          backgroundColor: "#FFFFFF",
          color: "#14213D",
          fontWeight: 700,
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        ← Back to Admin Ticket Dashboard
      </button>

      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "14px",
          backgroundColor: "#FFFFFF",
          marginBottom: "16px",
        }}
      >
        <div style={sectionTitleStyle}>Technician roster</div>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>
          Personal details for each registered technician.
        </p>
        {techListLoading && <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>Loading technicians…</p>}
        {techListError && !techListLoading && (
          <p style={{ margin: 0, color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{techListError}</p>
        )}
        {!techListLoading && !techListError && technicians.length === 0 && (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>No technicians yet. Add one below.</p>
        )}
        {!techListLoading && technicians.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}
          >
            {technicians.map((t) => (
              <div
                key={t.id || t.email}
                style={{
                  border: "1px solid #F5E7C6",
                  borderRadius: "12px",
                  padding: "14px",
                  backgroundColor: "#FAF3E1",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "12px",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    backgroundColor: t.profileImageUrl ? "#fff" : "#475569",
                    border: "1px solid #F5E7C6",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {t.profileImageUrl ? (
                    <img src={t.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{userDisplayInitial(t)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#222222", lineHeight: 1.25 }}>
                    {`${(t.firstName || "").trim()} ${(t.lastName || "").trim()}`.trim() || "Technician"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginTop: "6px", wordBreak: "break-word" }}>
                    {t.email || "—"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>
                    Phone: {(t.phoneNumber || "").trim() || "—"}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#14213D", marginTop: "6px" }}>
                    Specialty: {technicianCategoryLabel(t.technicianCategory)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid #F5E7C6",
          borderRadius: "10px",
          padding: "14px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div style={sectionTitleStyle}>Technicians</div>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>
          Create staff accounts. Technicians sign in with email and password on the main Sign In page.
        </p>
        <form onSubmit={submitAddTechnician} style={{ display: "grid", gap: "10px", maxWidth: "480px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input
              required
              placeholder="First name"
              value={techFirstName}
              onChange={(e) => setTechFirstName(e.target.value)}
              style={selectStyle}
            />
            <input
              required
              placeholder="Last name"
              value={techLastName}
              onChange={(e) => setTechLastName(e.target.value)}
              style={selectStyle}
            />
          </div>
          <input
            required
            type="email"
            placeholder="Work email"
            value={techEmail}
            onChange={(e) => setTechEmail(e.target.value)}
            style={selectStyle}
          />
          <input
            placeholder="Phone (optional)"
            value={techPhone}
            onChange={(e) => setTechPhone(e.target.value)}
            style={selectStyle}
          />
          <select
            required
            value={techCategory}
            onChange={(e) => setTechCategory(e.target.value)}
            style={selectStyle}
            aria-label="Technician category"
          >
            {TECHNICIAN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <PasswordInput
            required
            minLength={6}
            placeholder="Initial password (min 6 characters)"
            value={techPassword}
            onChange={(e) => setTechPassword(e.target.value)}
            style={selectStyle}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={techSubmitting}
            style={{ ...buttonStyle, opacity: techSubmitting ? 0.85 : 1, width: "fit-content" }}
          >
            {techSubmitting ? "Saving…" : "Add technician"}
          </button>
        </form>
        {techMessage ? (
          <p style={{ margin: "10px 0 0 0", color: "#2e7d32", fontSize: "13px", fontWeight: 600 }}>{techMessage}</p>
        ) : null}
        {techError ? <p style={{ margin: "10px 0 0 0", color: "#d32f2f", fontSize: "13px", fontWeight: 600 }}>{techError}</p> : null}
      </div>
    </>
  );
}

export default function TechnicianDashboard() {
  const user = useMemo(() => getStoredUser(), []);
  const isTechnician = (user?.role || "").toUpperCase() === "TECHNICIAN";

  return (
    <div style={isTechnician ? technicianPageOuterStyle : { ...pageStyleBase, justifyContent: "flex-start" }}>
      <section
        style={
          isTechnician
            ? technicianCardStyle
            : { ...containerStyle, maxWidth: "980px", margin: "0 auto" }
        }
      >
        {isTechnician ? <TechnicianWorkspace /> : <AdminTechnicianForm />}
      </section>
    </div>
  );
}
