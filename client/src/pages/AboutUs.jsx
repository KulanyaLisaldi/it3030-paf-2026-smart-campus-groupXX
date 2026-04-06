import React from "react";
import { useNavigate } from "react-router-dom";
import { appFontFamily } from "../utils/appFont";

/** Public asset: `client/public/about us.jpg` */
const ABOUT_HERO_IMAGE = "/about%20us.jpg";

const pageStyle = {
  width: "100%",
  minHeight: "100vh",
  margin: 0,
  padding: 0,
  backgroundColor: "#f8fafc",
  fontFamily: appFontFamily,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const heroWrapStyle = {
  position: "relative",
  width: "100%",
  minHeight: "min(52vh, 560px)",
  maxHeight: "70vh",
};

const heroImgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
};

const heroOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.35) 45%, rgba(15, 23, 42, 0.2) 100%)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: "clamp(20px, 4vw, 48px)",
  boxSizing: "border-box",
};

const heroTitleStyle = {
  margin: 0,
  fontSize: "clamp(28px, 5vw, 42px)",
  fontWeight: 800,
  lineHeight: 1.15,
  color: "#FFFFFF",
  textShadow: "0 2px 24px rgba(0,0,0,0.35)",
};

const heroAccentStyle = {
  color: "#FA8112",
};

const heroDescStyle = {
  margin: "12px 0 0 0",
  maxWidth: "720px",
  color: "rgba(255,255,255,0.95)",
  fontSize: "clamp(14px, 2vw, 17px)",
  lineHeight: 1.65,
  textShadow: "0 1px 12px rgba(0,0,0,0.4)",
};

const contentShellStyle = {
  width: "100%",
  padding: "clamp(24px, 4vw, 40px) clamp(16px, 5vw, 48px) 48px",
  boxSizing: "border-box",
};

const innerMaxStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};

const sectionTitleStyle = {
  margin: "0 0 12px 0",
  fontSize: "18px",
  color: "#14213D",
  fontWeight: 800,
};

const paragraphStyle = {
  margin: "0 0 16px 0",
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.7,
};

const listStyle = {
  margin: "0 0 20px 0",
  paddingLeft: "22px",
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.75,
};

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
  marginTop: "8px",
};

const cardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#FFFFFF",
  boxShadow: "0 6px 14px rgba(20, 33, 61, 0.05)",
};

const cardTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "15px",
  fontWeight: 800,
  color: "#14213D",
};

const cardTextStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
  lineHeight: 1.55,
};

const actionsStyle = {
  marginTop: "24px",
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const primaryBtnStyle = {
  padding: "12px 20px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: appFontFamily,
};

const secondaryBtnStyle = {
  padding: "12px 20px",
  borderRadius: "10px",
  border: "1px solid #E8E4DC",
  backgroundColor: "#FFFFFF",
  color: "#14213D",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: appFontFamily,
};

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <main style={pageStyle}>
      <section style={heroWrapStyle} aria-label="About CampusSync">
        <img src={ABOUT_HERO_IMAGE} alt="CampusSync — campus and community" style={heroImgStyle} />
        <div style={heroOverlayStyle}>
          <h1 style={heroTitleStyle}>
            About <span style={heroAccentStyle}>CampusSync</span>
          </h1>
          <p style={heroDescStyle}>
            CampusSync is your campus operations hub—bringing resources, bookings, and support tickets together in one
            place so students and staff can get things done without juggling disconnected tools.
          </p>
        </div>
      </section>

      <div style={contentShellStyle}>
        <div style={innerMaxStyle}>
          <h2 style={sectionTitleStyle}>Our mission</h2>
          <p style={paragraphStyle}>
            We help universities run day-to-day campus services more smoothly. Whether you need a lab or meeting room,
            equipment for a project, or help from a technician, CampusSync keeps the workflow clear and trackable from
            request to resolution.
          </p>

          <h2 style={{ ...sectionTitleStyle, marginTop: "24px" }}>What you can do here</h2>
          <ul style={listStyle}>
            <li>
              <strong style={{ color: "#14213D" }}>Resources</strong> — Browse and discover campus facilities and
              equipment with up-to-date information.
            </li>
            <li>
              <strong style={{ color: "#14213D" }}>Bookings</strong> — Reserve rooms and equipment through structured
              booking flows designed for campus use.
            </li>
            <li>
              <strong style={{ color: "#14213D" }}>Support &amp; tickets</strong> — Report issues, follow progress, and
              communicate with technicians when maintenance or IT support is needed.
            </li>
          </ul>

          <h2 style={{ ...sectionTitleStyle, marginTop: "24px" }}>Who it is for</h2>
          <div style={cardGridStyle}>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Students</h3>
              <p style={cardTextStyle}>
                Find what you need on campus, book shared spaces and gear, and raise support requests when something
                needs attention.
              </p>
            </div>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Faculty &amp; staff</h3>
              <p style={cardTextStyle}>
                Coordinate resources and report facility or technical issues in a way that teams can assign, track, and
                close efficiently.
              </p>
            </div>
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Campus operations</h3>
              <p style={cardTextStyle}>
                Administrators and technicians get a clearer picture of demand, workload, and service quality across the
                campus.
              </p>
            </div>
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: "28px" }}>Our values</h2>
          <p style={paragraphStyle}>
            We prioritize clarity, accountability, and security. Sign-in options and role-based access help ensure the
            right people see the right information—whether you sign in with your campus email or Google, or your team uses
            dedicated admin and technician tools behind the scenes.
          </p>

          <div style={actionsStyle}>
            <button type="button" style={primaryBtnStyle} onClick={() => navigate("/resources")}>
              Explore resources
            </button>
            <button type="button" style={secondaryBtnStyle} onClick={() => navigate("/contact")}>
              Contact us
            </button>
            <button type="button" style={secondaryBtnStyle} onClick={() => navigate("/")}>
              Back to home
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
