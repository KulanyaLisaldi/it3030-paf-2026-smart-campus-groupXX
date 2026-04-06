import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuthToken } from "../../api/http";
import { ACCOUNT_PATH } from "../../utils/authRedirect";
import { CAMPUS_USER_UPDATED, persistCampusUser, readCampusUser } from "../../utils/campusUserStorage";

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

function ProfileAvatarImage({ user, sizePx, fontSize }) {
  const url = user?.profileImageUrl;
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={sizePx}
        height={sizePx}
        style={{
          width: sizePx,
          height: sizePx,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }
  return (
    <span style={{ fontSize, fontWeight: 700, lineHeight: 1 }}>{profileInitial(user)}</span>
  );
}

const Navbar = () => {
  const navigate = useNavigate();
  const [logoutTick, setLogoutTick] = useState(0);
  const [userRevision, setUserRevision] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pinnedDropdown, setPinnedDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownWrapperRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const onUserStorage = () => setUserRevision((n) => n + 1);
    window.addEventListener(CAMPUS_USER_UPDATED, onUserStorage);
    return () => window.removeEventListener(CAMPUS_USER_UPDATED, onUserStorage);
  }, []);

  const user = useMemo(() => readCampusUser(), [userRevision, logoutTick]);
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      const t = event.target;
      if (dropdownWrapperRef.current && !dropdownWrapperRef.current.contains(t)) {
        setShowDropdown(false);
        setPinnedDropdown(false);
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
    persistCampusUser(null);
    setAuthToken(null);
    try {
      sessionStorage.removeItem("smartCampus_postLoginPath");
    } catch {
      /* ignore */
    }
    setShowProfileMenu(false);
    setLogoutTick((n) => n + 1);
    navigate("/signin", { replace: true });
  };

  const handleManageAccount = () => {
    setShowProfileMenu(false);
    navigate(ACCOUNT_PATH);
  };

  const profileTriggerStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: user?.profileImageUrl ? "#ffffff" : "#4b5563",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
    boxShadow: showProfileMenu ? "0 0 0 2px #FA8112" : user?.profileImageUrl ? "inset 0 0 0 1px #e5e7eb" : "none",
    padding: user?.profileImageUrl ? 0 : undefined,
    overflow: "hidden",
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
        <span>CampusSync</span>
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
                onClick={(e) => {
                  e.preventDefault();
                  setShowDropdown(false);
                  setPinnedDropdown(false);
                  navigate("/tickets/create");
                }}
              >
                Support Desk
              </a>
            </div>
          )}
        </div>
        <a
          href="/resources"
          style={centerLinkStyle}
          onClick={(e) => {
            e.preventDefault();
            navigate("/resources");
          }}
        >
          Resources
        </a>
        <a href="#about" style={centerLinkStyle}>
          About
        </a>
        <a
          href="/contact"
          style={centerLinkStyle}
          onClick={(e) => {
            e.preventDefault();
            navigate("/contact");
          }}
        >
          Contact Us
        </a>
      </div>

      <div style={rightContainerStyle}>
        {isLoggedIn && user ? (
          <div
            ref={profileMenuRef}
            style={{ position: "relative" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              aria-label="Account menu"
              style={profileTriggerStyle}
              onClick={() => setShowProfileMenu((p) => !p)}
              onMouseEnter={(e) => {
                if (user?.profileImageUrl) {
                  e.currentTarget.style.opacity = "0.9";
                } else {
                  e.currentTarget.style.backgroundColor = "#374151";
                }
              }}
              onMouseLeave={(e) => {
                if (user?.profileImageUrl) {
                  e.currentTarget.style.opacity = "1";
                } else {
                  e.currentTarget.style.backgroundColor = "#4b5563";
                }
              }}
            >
              <ProfileAvatarImage user={user} sizePx={40} fontSize={16} />
            </button>
            {showProfileMenu && (
              <div style={profilePanelStyle} role="menu">
                <div style={{ padding: "20px 20px 16px", textAlign: "center" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: user?.profileImageUrl ? "#f3f4f6" : "#6b7280",
                      color: "#FFFFFF",
                      fontSize: "24px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      overflow: "hidden",
                      boxShadow: user?.profileImageUrl ? "inset 0 0 0 1px #e5e7eb" : "none",
                    }}
                  >
                    <ProfileAvatarImage user={user} sizePx={64} fontSize={24} />
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
