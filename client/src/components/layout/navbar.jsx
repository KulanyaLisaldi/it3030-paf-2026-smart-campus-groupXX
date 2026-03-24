import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [pinnedDropdown, setPinnedDropdown] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("smartCampusUser")));
  const dropdownWrapperRef = useRef(null);
  const [showSupportDeskMenu, setShowSupportDeskMenu] = useState(false);

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (!dropdownWrapperRef.current) return;
      const clickedInside = dropdownWrapperRef.current.contains(event.target);
      if (!clickedInside) {
        setShowDropdown(false);
        setPinnedDropdown(false);
        setShowSupportDeskMenu(false);
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

  const testButtonStyle = {
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid #FA8112",
    backgroundColor: "#F5E7C6",
    color: "#222222",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
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

  const logoutButtonStyle = {
    padding: "8px 20px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#222222",
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
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <nav style={navStyle}>
      {/* Left - Logo + Smart Campus */}
      <div 
        style={brandStyle}
        onClick={() => navigate('/')}
      >
        <div style={logoBoxStyle}>SC</div>
        <span>Smart Campus</span>
      </div>

      {/* Center - Menu */}
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
                  // Toggle submenu instead of navigating immediately
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
                      navigate("/tickets/create");
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

      {/* Right - Auth actions */}
      <div style={rightContainerStyle}>
        <button
          type="button"
          style={testButtonStyle}
          onClick={() => navigate('/test')}
        >
          Test
        </button>

        {isLoggedIn ? (
          <button
            style={logoutButtonStyle}
            onMouseEnter={(e) => handleLoginHover(e, true)}
            onMouseLeave={(e) => handleLoginHover(e, false)}
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : (
          <button
            style={signInButtonStyle}
            onMouseEnter={(e) => handleLoginHover(e, true)}
            onMouseLeave={(e) => handleLoginHover(e, false)}
            onClick={() => navigate('/signin')}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

