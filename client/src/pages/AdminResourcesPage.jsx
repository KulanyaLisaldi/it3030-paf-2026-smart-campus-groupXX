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

export default function AdminResourcesPage() {
  return (
    <AdminLayout activeSection="resources" pageTitle="Resource Management" description="Manage campus resources. (Coming soon)">
      <div style={PLACEHOLDER_STYLE}>Resource Management tools will appear here in a future update.</div>
    </AdminLayout>
  );
}

