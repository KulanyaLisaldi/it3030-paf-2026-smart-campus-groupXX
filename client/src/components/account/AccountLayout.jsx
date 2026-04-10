import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setAuthToken } from "../../api/http";
import { persistCampusUser } from "../../utils/campusUserStorage";
import campusSyncLogo from "../../assets/campus-sync-logo.png";

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

const navItemBase = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px 10px 14px",
  margin: "2px 0",
  border: "none",
  borderRadius: "6px",
  color: "#111827",
  fontSize: "14px",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
};

const navItem = (active) =>
  active
    ? {
        ...navItemBase,
        background: "#fff7ed",
        borderLeft: "3px solid #FA8112",
        fontWeight: 600,
      }
    : {
        ...navItemBase,
        borderLeft: "3px solid transparent",
        fontWeight: 500,
      };

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

function IconLogout({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const navSubItem = (active) => {
  const base = navItem(active);
  return { ...base, paddingLeft: "28px", fontSize: "13px" };
};

const bookingsToggleRow = (active) => ({
  ...navItem(active),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export default function AccountLayout({ active = "personal", children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onBookingsHistory = location.pathname === "/account/bookings/history";
  const onBookingsUpcoming = active === "bookings" && !onBookingsHistory;
  const [accountOpen, setAccountOpen] = useState(true);
  const [activitiesOpen, setActivitiesOpen] = useState(true);
  const [bookingsOpen, setBookingsOpen] = useState(() => location.pathname.startsWith("/account/bookings"));

  useEffect(() => {
    if (location.pathname.startsWith("/account/bookings")) setBookingsOpen(true);
  }, [location.pathname]);

  return (
    <div style={pageWrap}>
      <style>{`
        .account-sidebar-nav-area button.account-nav-row[data-nav-active="false"]:hover {
          background-color: #ffedd5;
        }
      `}</style>
      <aside style={sidebarStyle}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              borderRadius: "8px",
            }}
            aria-label="CampusSync — go to home"
          >
            <img
              src={campusSyncLogo}
              alt="CampusSync"
              style={{
                height: "32px",
                width: "auto",
                maxWidth: "100%",
                objectFit: "contain",
                objectPosition: "left center",
                display: "block",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>Account</div>
            </div>
          </button>
        </div>
        <div className="account-sidebar-nav-area" style={{ padding: "8px 8px 0", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <button type="button" style={sectionBtn(accountOpen)} onClick={() => setAccountOpen((o) => !o)} aria-expanded={accountOpen}>
            Account
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{accountOpen ? "▼" : "▶"}</span>
          </button>
          {accountOpen && (
            <div style={{ padding: "0 4px 8px" }}>
              <button
                type="button"
                className="account-nav-row"
                data-nav-active={active === "personal" ? "true" : "false"}
                style={navItem(active === "personal")}
                onClick={() => navigate("/account")}
              >
                Personal info
              </button>
            </div>
          )}
          <button type="button" style={sectionBtn(activitiesOpen)} onClick={() => setActivitiesOpen((o) => !o)} aria-expanded={activitiesOpen}>
            Activities
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{activitiesOpen ? "▼" : "▶"}</span>
          </button>
          {activitiesOpen && (
            <div style={{ padding: "0 4px 8px" }}>
              <button
                type="button"
                className="account-nav-row"
                data-nav-active={active === "tickets" ? "true" : "false"}
                style={navItem(active === "tickets")}
                onClick={() => navigate("/my-tickets")}
              >
                My tickets
              </button>
              <button
                type="button"
                className="account-nav-row"
                data-nav-active="false"
                style={bookingsToggleRow(false)}
                onClick={() => setBookingsOpen((o) => !o)}
                aria-expanded={bookingsOpen}
              >
                <span>My bookings</span>
                <span style={{ fontSize: "10px", color: "#9ca3af", flexShrink: 0 }} aria-hidden>
                  {bookingsOpen ? "▼" : "▶"}
                </span>
              </button>
              {bookingsOpen && (
                <>
                  <button
                    type="button"
                    className="account-nav-row"
                    data-nav-active={onBookingsUpcoming ? "true" : "false"}
                    style={navSubItem(onBookingsUpcoming)}
                    onClick={() => navigate("/account/bookings")}
                  >
                    Upcoming bookings
                  </button>
                  <button
                    type="button"
                    className="account-nav-row"
                    data-nav-active={onBookingsHistory ? "true" : "false"}
                    style={navSubItem(onBookingsHistory)}
                    onClick={() => navigate("/account/bookings/history")}
                  >
                    Booking history
                  </button>
                </>
              )}
              <button
                type="button"
                className="account-nav-row"
                data-nav-active={active === "contactMessages" ? "true" : "false"}
                style={navItem(active === "contactMessages")}
                onClick={() => navigate("/account/contact-messages")}
              >
                My contact message
              </button>
              <button
                type="button"
                className="account-nav-row"
                data-nav-active={active === "notifications" ? "true" : "false"}
                style={navItem(active === "notifications")}
                onClick={() => navigate("/account/notifications")}
              >
                Notifications
              </button>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 16px 12px", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "12px", alignItems: "stretch" }}>
          <button
            type="button"
            onClick={() => {
              persistCampusUser(null);
              setAuthToken(null);
              navigate("/", { replace: true });
            }}
            style={{
              ...footerBtnBase,
              border: "1px solid #fecaca",
              background: "#fee2e2",
              color: "#991b1b",
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
