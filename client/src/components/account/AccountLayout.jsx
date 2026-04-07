import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { persistCampusUser } from "../../utils/campusUserStorage";

const pageWrap = {
  height: "100vh",
  maxHeight: "100vh",
  display: "flex",
  overflow: "hidden",
  backgroundColor: "#f3f4f6",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const sidebarStyle = {
  width: "268px",
  minWidth: "268px",
  backgroundColor: "#ffffff",
  borderRight: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  flexShrink: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const mainStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: "auto",
  padding: "32px 40px 48px",
  boxSizing: "border-box",
};

const navItem = (active) => ({
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px 10px 14px",
  margin: "2px 0",
  border: "none",
  borderRadius: "6px",
  background: active ? "#ecfdf5" : "transparent",
  borderLeft: active ? "3px solid #059669" : "3px solid transparent",
  color: "#111827",
  fontSize: "14px",
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
});

const sectionBtn = (open) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "12px 14px",
  border: "none",
  background: "transparent",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "#6b7280",
  cursor: "pointer",
  textTransform: "uppercase",
});

const footerBtnBase = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "10px 14px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function IconBackArrow({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconLogout({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AccountLayout({ active = "personal", children }) {
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(true);
  const [activitiesOpen, setActivitiesOpen] = useState(true);

  return (
    <div style={pageWrap}>
      <aside style={sidebarStyle}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #FA8112, #F5E7C6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "15px" }}>C</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>CampusSync</div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>Account</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "8px 8px 0", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <button type="button" style={sectionBtn(accountOpen)} onClick={() => setAccountOpen((o) => !o)} aria-expanded={accountOpen}>
            Account
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{accountOpen ? "▼" : "▶"}</span>
          </button>
          {accountOpen && (
            <div style={{ padding: "0 4px 8px" }}>
              <button type="button" style={navItem(active === "personal")} onClick={() => navigate("/account")}>Personal info</button>
            </div>
          )}
          <button type="button" style={sectionBtn(activitiesOpen)} onClick={() => setActivitiesOpen((o) => !o)} aria-expanded={activitiesOpen}>
            Activities
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{activitiesOpen ? "▼" : "▶"}</span>
          </button>
          {activitiesOpen && (
            <div style={{ padding: "0 4px 8px" }}>
              <button type="button" style={navItem(active === "tickets")} onClick={() => navigate("/my-tickets")}>My tickets</button>
              <button type="button" style={navItem(active === "bookings")} onClick={() => navigate("/account/bookings")}>My bookings</button>
              <button type="button" style={navItem(active === "contactMessages")} onClick={() => navigate("/account/contact-messages")}>My contact message</button>
              <button type="button" style={navItem(active === "notifications")} onClick={() => navigate("/account/notifications")}>Notifications</button>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 16px 12px", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "12px", alignItems: "stretch" }}>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
                textDecoration: "none",
              }}
            >
              <IconBackArrow />
              <span style={{ textDecoration: "underline" }}>Back</span>
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              persistCampusUser(null);
              localStorage.removeItem("smartCampusAuthToken");
              navigate("/", { replace: true });
            }}
            style={{
              ...footerBtnBase,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#374151",
            }}
          >
            <IconLogout />
            Logout
          </button>
        </div>
      </aside>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}
