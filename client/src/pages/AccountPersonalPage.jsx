import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteAccount, fetchCurrentUser, removeProfileAvatar, updateProfilePhone, uploadProfileAvatar } from "../api/auth";
import { getAuthToken } from "../api/http";
import { persistCampusUser } from "../utils/campusUserStorage";
import { isValidProfilePhone, phoneFromServer, PROFILE_PHONE_DIGITS, sanitizeProfilePhoneInput } from "../utils/profilePhone";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";

/** Match account My tickets cards: light cream border */
const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 10px 24px rgba(20, 33, 61, 0.06)",
  border: "1px solid #F5E7C6",
  padding: "28px 32px",
  maxWidth: "720px",
};

const inputDisabled = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#f9fafb",
  color: "#4b5563",
  fontSize: "14px",
  boxSizing: "border-box",
  cursor: "not-allowed",
  opacity: 1,
};

const inputEditable = { ...inputDisabled, backgroundColor: "#ffffff", color: "#111827" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "6px" };
const readOnlyBadgeStyle = { marginLeft: "8px", fontSize: "11px", fontWeight: 700, color: "#6b7280", letterSpacing: "0.02em", textTransform: "uppercase" };

export default function AccountPersonalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, message: "", error: "" });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRemoveBusy, setAvatarRemoveBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileRef = useRef(null);

  const loadProfile = useCallback(async () => {
    setLoadError("");
    try {
      const u = await fetchCurrentUser();
      setProfile(u);
      setPhoneDraft(phoneFromServer(u.phoneNumber));
      persistCampusUser(u);
    } catch (e) {
      setLoadError(e?.message || "Could not load profile");
    }
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      rememberPostLoginPath(location.pathname);
      navigate("/signin", { replace: true, state: { from: location.pathname } });
      return;
    }
    void loadProfile();
  }, [navigate, loadProfile, location.pathname]);

  const serverPhone = phoneFromServer(profile?.phoneNumber);
  const roleText = useMemo(() => String(profile?.role || "").trim().toUpperCase() || "USER", [profile?.role]);
  const providerText = useMemo(() => {
    const provider = String(profile?.provider || "").trim().toLowerCase();
    if (provider.includes("google")) return "Google OAuth";
    if (provider.includes("email")) return "Email";
    if (profile?.googleSubject) return "Google OAuth";
    return "Email";
  }, [profile]);
  const canSave = useMemo(() => profile && isValidProfilePhone(phoneDraft) && phoneDraft !== serverPhone, [profile, phoneDraft, serverPhone]);
  const isAdminAccount = roleText === "ADMIN";

  const handleSavePhone = async () => {
    if (!canSave) return;
    setSaveState({ busy: true, message: "", error: "" });
    try {
      const updated = await updateProfilePhone({ phoneNumber: phoneDraft });
      setProfile(updated);
      persistCampusUser(updated);
      setSaveState({ busy: false, message: "Changes saved.", error: "" });
    } catch (e) {
      setSaveState({ busy: false, message: "", error: e?.message || "Save failed" });
    }
  };

  const handleAvatarChange = async (e) => {
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
      setProfile(updated);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo saved.");
    } catch (err) {
      setAvatarError(err?.message || "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.profileImageUrl) return;
    const ok = window.confirm("Remove your profile photo from CampusSync?");
    if (!ok) return;
    setAvatarError("");
    setAvatarSuccess("");
    setAvatarRemoveBusy(true);
    try {
      const updated = await removeProfileAvatar();
      setProfile(updated);
      persistCampusUser(updated);
      setAvatarSuccess("Profile photo removed.");
    } catch (err) {
      setAvatarError(err?.message || "Could not remove photo");
    } finally {
      setAvatarRemoveBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isAdminAccount) {
      window.alert("Administrator accounts cannot be deleted from your profile.");
      return;
    }
    const ok = window.confirm("Delete your CampusSync account? This cannot be undone.");
    if (!ok) return;
    setDeleteBusy(true);
    try {
      await deleteAccount();
      persistCampusUser(null);
      localStorage.removeItem("smartCampusAuthToken");
      navigate("/", { replace: true });
    } catch (e) {
      window.alert(e?.message || "Could not delete account");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!getAuthToken()) return null;

  return (
    <AccountLayout active="personal">
      {loadError && <p style={{ color: "#b91c1c", marginBottom: "16px" }}>{loadError}</p>}
      {!profile && !loadError && <p style={{ color: "#6b7280", marginBottom: "16px" }}>Loading…</p>}
      {profile && (
        <>
          <div style={{ ...cardStyle, marginBottom: "20px" }}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>Profile photo</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <div style={{ width: "96px", height: "96px", borderRadius: "50%", backgroundColor: "#e5e7eb", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "32px", fontWeight: 700 }}>
                {profile.profileImageUrl ? <img src={profile.profileImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (profile.firstName || profile.email || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: "1", minWidth: "200px" }}>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <button type="button" disabled={avatarBusy || avatarRemoveBusy} onClick={() => fileRef.current?.click()} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", fontWeight: 600, fontSize: "14px", cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer" }}>
                    {avatarBusy ? "Saving…" : profile.profileImageUrl ? "Change profile photo" : "Upload profile photo"}
                  </button>
                  {profile.profileImageUrl && (
                    <button type="button" disabled={avatarBusy || avatarRemoveBusy} onClick={handleRemoveAvatar} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fff", fontWeight: 600, fontSize: "14px", color: "#b91c1c", cursor: avatarBusy || avatarRemoveBusy ? "wait" : "pointer" }}>
                      {avatarRemoveBusy ? "Removing…" : "Remove photo"}
                    </button>
                  )}
                </div>
                {avatarSuccess && <p style={{ color: "#059669", fontSize: "13px", marginTop: "10px", marginBottom: 0 }}>{avatarSuccess}</p>}
                {avatarError && <p style={{ color: "#b91c1c", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>{avatarError}</p>}
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: "20px" }}>
            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Email address <span style={readOnlyBadgeStyle}>Read-only</span></label>
              <input type="email" readOnly disabled value={profile.email || ""} style={inputDisabled} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
              <div><label style={labelStyle}>First name <span style={readOnlyBadgeStyle}>Read-only</span></label><input readOnly disabled value={profile.firstName || ""} style={inputDisabled} /></div>
              <div><label style={labelStyle}>Last name <span style={readOnlyBadgeStyle}>Read-only</span></label><input readOnly disabled value={profile.lastName || ""} style={inputDisabled} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
              <div><label style={labelStyle}>Role <span style={readOnlyBadgeStyle}>Read-only</span></label><input readOnly disabled value={roleText} style={inputDisabled} /></div>
              <div><label style={labelStyle}>Login Provider <span style={readOnlyBadgeStyle}>Read-only</span></label><input readOnly disabled value={providerText} style={inputDisabled} /></div>
            </div>
            {providerText === "Google OAuth" && <p style={{ margin: "0 0 18px 0", fontSize: "13px", color: "#1f2937", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 12px", lineHeight: 1.45 }}>This account uses Google sign-in. Some identity fields are managed by Google.</p>}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Phone number</label>
              <input type="tel" inputMode="numeric" maxLength={PROFILE_PHONE_DIGITS} value={phoneDraft} onChange={(e) => { setPhoneDraft(sanitizeProfilePhoneInput(e.target.value)); setSaveState((s) => ({ ...s, message: "", error: "" })); }} placeholder="0771234567" style={inputEditable} autoComplete="tel" />
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px", marginBottom: 0 }}>{PROFILE_PHONE_DIGITS} digits only (no letters). Enter a full mobile number to save.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px" }}>
              {saveState.message && <span style={{ fontSize: "14px", color: "#059669" }}>{saveState.message}</span>}
              {saveState.error && <span style={{ fontSize: "14px", color: "#b91c1c" }}>{saveState.error}</span>}
              <button type="button" disabled={!canSave || saveState.busy} onClick={handleSavePhone} style={{ padding: "10px 22px", borderRadius: "8px", border: "none", backgroundColor: canSave && !saveState.busy ? "#FA8112" : "#d1d5db", color: "#ffffff", fontWeight: 600, fontSize: "14px", cursor: canSave && !saveState.busy ? "pointer" : "not-allowed" }}>
                {saveState.busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>

          {!isAdminAccount && (
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>Delete account</h2>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px", lineHeight: 1.5 }}>You will lose access to your CampusSync account once your deletion request is confirmed.</p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" disabled={deleteBusy} onClick={handleDeleteAccount} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#dc2626", color: "#ffffff", fontWeight: 600, fontSize: "14px", cursor: deleteBusy ? "wait" : "pointer" }}>
                  {deleteBusy ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AccountLayout>
  );
}
