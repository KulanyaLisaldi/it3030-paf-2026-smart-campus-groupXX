import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../../api/http";
import { CREATE_TICKET_PATH, rememberPostLoginPath } from "../../utils/authRedirect";

function readStoredUser() {
  try {
    const raw = localStorage.getItem("smartCampusUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function displayName(user) {
  if (!user) return "";
  const first = (user.firstName || "").trim();
  const last = (user.lastName || "").trim();
  if (first || last) return `${first} ${last}`.trim();
  return user.fullName?.trim() || user.email || "User";
}

function profileInitial(user) {
  if (!user) return "?";
  const first = (user.firstName || "").trim();
  if (first) return first.charAt(0).toUpperCase();
  const email = (user.email || "").trim();
  if (email) return email.charAt(0).toUpperCase();
  return "U";
}

const Navbar = () => {
  const navigate = useNavigate();
  const [, setLogoutTick] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pinnedDropdown, setPinnedDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownWrapperRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [showSupportDeskMenu, setShowSupportDeskMenu] = useState(false);

  const user = readStoredUser();
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      const t = event.target;
      if (dropdownWrapperRef.current && !dropdownWrapperRef.current.contains(t)) {
        setShowDropdown(false);
        setPinnedDropdown(false);
        setShowSupportDeskMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(t)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  const navStyle = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 32px",
    boxSizing: "border-box",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
    backgroundColor: "#FFFFFF",
    position: "sticky",
    top: 0,
    zIndex: 100,
  };

  const brandStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
    fontSize: "18px",
    color: "#222222",
    cursor: "pointer",
  };

  const logoBoxStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #FA8112, #F5E7C6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "16px",
  };

  const centerMenuStyle = {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    fontSize: "15px",
    position: "relative",
  };

  const centerLinkStyle = {
    cursor: "pointer",
    color: "#222222",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const dropdownArrowStyle = {
    fontSize: "10px",
    fontWeight: "bold",
    color: "#FA8112",
    transition: "transform 0.2s ease",
    display: "inline-block",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: "0",
    backgroundColor: "#FFFFFF",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    minWidth: "200px",
    marginTop: "8px",
    padding: "8px 0",
    zIndex: 1000,
  };

  const dropdownItemStyle = {
    padding: "10px 16px",
    color: "#222222",
    cursor: "pointer",
    textDecoration: "none",
    display: "block",
    transition: "background-color 0.2s ease",
  };

  const rightContainerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const signInButtonStyle = {
    padding: "8px 20px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#FA8112",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  };

  const handleLoginHover = (e, isHover) => {
    e.target.style.opacity = isHover ? "0.9" : "1";
  };

  const handleDropdownItemHover = (e, isHover) => {
    if (isHover) {
      e.target.style.backgroundColor = "#FAF3E1";
    } else {
      e.target.style.backgroundColor = "transparent";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("smartCampusUser");
    localStorage.removeItem("smartCampusAuthToken");
    setShowProfileMenu(false);
    setLogoutTick((n) => n + 1);
    navigate("/", { replace: true });
  };

  const handleManageAccount = () => {
    setShowProfileMenu(false);
    navigate("/");
  };

  const profileTriggerStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#4b5563",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    boxShadow: showProfileMenu ? "0 0 0 2px #FA8112" : "none",
  };

  const profilePanelStyle = {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    width: "min(320px, calc(100vw - 48px))",
    backgroundColor: "#FFFFFF",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(15, 23, 42, 0.12)",
    zIndex: 1100,
    overflow: "hidden",
  };

  const dividerStyle = {
    height: "1px",
    backgroundColor: "#e5e7eb",
    margin: 0,
    border: "none",
  };

  return (
    <nav style={navStyle}>
      <div style={brandStyle} onClick={() => navigate("/")}>
        <div style={logoBoxStyle}>SC</div>
        <span>Smart Campus</span>
      </div>

      <div style={centerMenuStyle}>
        <div
          ref={dropdownWrapperRef}
          style={{ position: "relative" }}
          onMouseEnter={() => {
            if (!pinnedDropdown) setShowDropdown(true);
          }}
        >
          <div
            style={centerLinkStyle}
            onClick={() => {
              setPinnedDropdown((prev) => {
                const nextPinned = !prev;
                setShowDropdown(nextPinned);
                return nextPinned;
              });
            }}
          >
            Features
            <span style={dropdownArrowStyle}>▼</span>
          </div>
          {showDropdown && (
            <div style={dropdownStyle}>
              <a
                href="#lab-booking"
                style={dropdownItemStyle}
                onMouseEnter={(e) => handleDropdownItemHover(e, true)}
                onMouseLeave={(e) => handleDropdownItemHover(e, false)}
                onClick={() => {
                  setShowDropdown(false);
                  setPinnedDropdown(false);
                }}
              >
                Lab Booking
              </a>
              <a
                href="#meeting-room-booking"
                style={dropdownItemStyle}
                onMouseEnter={(e) => handleDropdownItemHover(e, true)}
                onMouseLeave={(e) => handleDropdownItemHover(e, false)}
                onClick={() => {
                  setShowDropdown(false);
                  setPinnedDropdown(false);
                }}
              >
                Meeting Room Booking
              </a>
              <a
                href="#equipment-booking"
                style={dropdownItemStyle}
                onMouseEnter={(e) => handleDropdownItemHover(e, true)}
                onMouseLeave={(e) => handleDropdownItemHover(e, false)}
                onClick={() => {
                  setShowDropdown(false);
                  setPinnedDropdown(false);
                }}
              >
                Equipment Booking
              </a>
              <a
                href="#support-desk"
                style={dropdownItemStyle}
                onMouseEnter={(e) => handleDropdownItemHover(e, true)}
                onMouseLeave={(e) => handleDropdownItemHover(e, false)}
                onClick={() => {
                  setShowSupportDeskMenu((prev) => !prev);
                }}
              >
                Support Desk
              </a>
              {showSupportDeskMenu && (
                <div style={{ padding: "4px 0 0 16px" }}>
                  <a
                    href="/tickets/create"
                    style={dropdownItemStyle}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDropdown(false);
                      setPinnedDropdown(false);
                      setShowSupportDeskMenu(false);
                      if (!getAuthToken()) {
                        rememberPostLoginPath(CREATE_TICKET_PATH);
                        navigate("/signin", { state: { from: CREATE_TICKET_PATH } });
                      } else {
                        navigate(CREATE_TICKET_PATH);
                      }
                    }}
                  >
                    Create Ticket
                  </a>
                  <a
                    href="/my-tickets"
                    style={dropdownItemStyle}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDropdown(false);
                      setPinnedDropdown(false);
                      setShowSupportDeskMenu(false);
                      navigate("/my-tickets");
                    }}
                  >
                    My Tickets
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        <a href="#resources" style={centerLinkStyle}>
          Resources
        </a>
        <a href="#about" style={centerLinkStyle}>
          About
        </a>
        <a href="#contact" style={centerLinkStyle}>
          Contact Us
        </a>
      </div>

      <div style={rightContainerStyle}>
        {isLoggedIn && user ? (
          <div ref={profileMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              style={profileTriggerStyle}
              onClick={() => setShowProfileMenu((p) => !p)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#4b5563";
              }}
            >
              {profileInitial(user)}
            </button>
            {showProfileMenu && (
              <div style={profilePanelStyle} role="menu">
                <div style={{ padding: "20px 20px 16px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: "#6b7280",
                      color: "#FFFFFF",
                      fontSize: "24px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    {profileInitial(user)}
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "4px",
                      lineHeight: 1.3,
                    }}
                  >
                    {displayName(user)}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", wordBreak: "break-word" }}>
                    {user.email || "—"}
                  </div>
                  <button
                    type="button"
                    onClick={handleManageAccount}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#FFFFFF",
                      color: "#111827",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                    }}
                  >
                    Manage Your Account
                  </button>
                </div>
                <hr style={dividerStyle} />
                <div style={{ padding: "4px 0" }}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/my-tickets");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 20px",
                      border: "none",
                      background: "none",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#111827",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#FAF3E1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    My Tickets
                  </button>
                </div>
                <hr style={dividerStyle} />
                <div style={{ padding: "4px 0 8px" }}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 20px",
                      border: "none",
                      background: "none",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#111827",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fef2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            style={signInButtonStyle}
            onMouseEnter={(e) => handleLoginHover(e, true)}
            onMouseLeave={(e) => handleLoginHover(e, false)}
            onClick={() => navigate("/signin")}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
