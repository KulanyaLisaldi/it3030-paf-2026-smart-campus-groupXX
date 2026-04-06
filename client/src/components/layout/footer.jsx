import React from 'react';
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  const footerStyle = {
    backgroundColor: '#222222',
    color: '#FFFFFF',
    padding: '32px 16px',
  };

  const footerLinkStyle = {
    color: '#F5E7C6',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  };

  const footerLinkHoverStyle = {
    color: '#FA8112',
  };

  const handleLinkHover = (e, isHover) => {
    if (isHover) {
      Object.assign(e.target.style, footerLinkHoverStyle);
    } else {
      e.target.style.color = '#F5E7C6';
    }
  };

  return (
    <footer style={footerStyle}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>About</h3>
            <h4 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>CampusSync Operations Hub</h4>
            <p style={{ color: '#F5E7C6' }}>"Book labs/rooms and track maintenance tickets."</p>
            <button
              type="button"
              onClick={() => navigate('/about')}
              style={{ ...footerLinkStyle, background: 'none', border: 'none', padding: 0, marginTop: '12px', font: 'inherit', textAlign: 'left' }}
              onMouseEnter={(e) => handleLinkHover(e, true)}
              onMouseLeave={(e) => handleLinkHover(e, false)}
            >
              About CampusSync →
            </button>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  Resources
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  My Bookings
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  My Tickets
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Support</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  Help / FAQs
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  System Status
                </a>
              </li>
              <li>
                <a 
                  href="/contact"
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/contact");
                  }}
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>Legal</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  style={footerLinkStyle}
                  onMouseEnter={(e) => handleLinkHover(e, true)}
                  onMouseLeave={(e) => handleLinkHover(e, false)}
                >
                  Terms of Use
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div style={{ borderTop: '1px solid #444444', marginTop: '32px', paddingTop: '16px', textAlign: 'center' }}>
          <p style={{ color: '#F5E7C6' }}>© 2026 CampusSync Hub | v1.0.0</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
