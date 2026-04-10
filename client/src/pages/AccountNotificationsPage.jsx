import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";
import NotificationListView from "../components/notifications/NotificationListView";

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
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 }}>Latest booking and support updates appear here in real time.</p>
      <NotificationListView />
    </AccountLayout>
  );
}
