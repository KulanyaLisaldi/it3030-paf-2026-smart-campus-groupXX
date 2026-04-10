import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "../api/http";
import { rememberPostLoginPath } from "../utils/authRedirect";
import AccountLayout from "../components/account/AccountLayout";
import NotificationPreferencesCard from "../components/account/NotificationPreferencesCard";
import NotificationListView from "../components/notifications/NotificationListView";
import { CAMPUS_USER_UPDATED, readCampusUser } from "../utils/campusUserStorage";

export default function AccountNotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [, bump] = useState(0);

  useEffect(() => {
    const onUser = () => bump((n) => n + 1);
    window.addEventListener(CAMPUS_USER_UPDATED, onUser);
    return () => window.removeEventListener(CAMPUS_USER_UPDATED, onUser);
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      rememberPostLoginPath(location.pathname);
      navigate("/signin", { replace: true, state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  if (!getAuthToken()) return null;

  const campus = readCampusUser();
  const showPrefs = String(campus?.role || "").toUpperCase() === "USER";

  return (
    <AccountLayout active="notifications">
      <h1 style={{ fontSize: "28px", fontWeight: 650, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.03em" }}>Notifications</h1>
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px", lineHeight: 1.5 }}>Latest booking and support updates appear here in real time.</p>
      {showPrefs ? <NotificationPreferencesCard /> : null}
      <NotificationListView />
    </AccountLayout>
  );
}
