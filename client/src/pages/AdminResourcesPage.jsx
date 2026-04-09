import React from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import AdminResourcesTable from "../components/admin/AdminResourcesTable.jsx";
import { appFontFamily } from "../utils/appFont";

export default function AdminResourcesPage() {
  return (
    <AdminLayout activeSection="resources" pageTitle={null} description={null}>
      <div style={{ fontFamily: appFontFamily }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", fontWeight: 800, color: "#14213D" }}>Resource Management</h1>
        <p style={{ margin: "0 0 28px 0", fontSize: "14px", color: "#64748b", maxWidth: "640px", lineHeight: 1.5 }}>
          Maintain facilities and assets catalogue with quick actions and filtering.
        </p>
        <AdminResourcesTable />
      </div>
    </AdminLayout>
  );
}
