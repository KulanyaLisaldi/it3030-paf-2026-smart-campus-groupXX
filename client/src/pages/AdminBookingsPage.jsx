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

export default function AdminBookingsPage() {
  return (
    <AdminLayout activeSection="bookings" pageTitle="Booking Management" description="Manage campus bookings and reservations. (Coming soon)">
      <div style={PLACEHOLDER_STYLE}>Booking Management tools will appear here in a future update.</div>
    </AdminLayout>
  );
}

