import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  border: "1px solid #e5e7eb",
  padding: "28px 32px",
  maxWidth: "980px",
};

export default function AccountNotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getAuthToken()) {
      rememberPostLoginPath(location.pathname);
      navigate("/signin", { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  if (!getAuthToken()) return null;

  return (
    <AccountLayout active="notifications">
      <h1 style={{ fontSize: "28px", fontWeight: 650, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>Notifications</h1>
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 }}>Campus notifications and alerts will appear here in a future update.</p>
      <div style={cardStyle}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>You have no notifications.</p>
      </div>
    </AccountLayout>
  );
}
