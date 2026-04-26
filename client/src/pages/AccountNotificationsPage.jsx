import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";
import NotificationPreferencesCard from "../components/account/NotificationPreferencesCard";
import NotificationListView from "../components/notifications/NotificationListView";
import { notificationUiRootStyle } from "../utils/notificationTypography";

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
      <div style={notificationUiRootStyle}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 650,
            color: "#111827",
            margin: "0 0 8px 0",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          Notifications
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", lineHeight: 1.55, fontWeight: 450 }}>
          Latest booking and support updates appear here in real time.
        </p>
        <NotificationPreferencesCard />
        <NotificationListView />
      </div>
    </AccountLayout>
  );
}
