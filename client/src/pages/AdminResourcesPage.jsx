import React from "react";
import AdminLayout from "../components/admin/AdminLayout.jsx";
import AdminResourcesTable from "../components/admin/AdminResourcesTable.jsx";

export default function AdminResourcesPage() {
  return (
    <AdminLayout
      activeSection="resources"
      pageTitle="Resource Management"
      description="Maintain facilities and assets catalogue with quick actions and filtering."
    >
      <AdminResourcesTable />
    </AdminLayout>
  );
}

