import React from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import NotificationListView from "../components/notifications/NotificationListView.jsx";

export default function AdminNotificationsPage() {
  return (
    <AdminLayout activeSection="notifications" pageTitle="Notifications" description="Real-time booking and ticket alerts for administrators.">
      <NotificationListView />
    </AdminLayout>
  );
}

