import React from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";

const PLACEHOLDER_STYLE = {
  maxWidth: "560px",
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1",
  padding: "40px 28px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.55,
  boxSizing: "border-box",
};

export default function AdminAnalyticsPage() {
  return (
    <AdminLayout activeSection="analytics" pageTitle="Analytics & Report" description="View analytics and reports for tickets and operations. (Coming soon)">
      <div style={PLACEHOLDER_STYLE}>Analytics & Report tools will appear here in a future update.</div>
    </AdminLayout>
  );
}

