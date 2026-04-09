import React from "react";
import { appFontFamily } from "../utils/appFont";
import privacyHeroImage from "../assets/privacy-policy-hero.png";

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
  minHeight: "min(62vh, 720px)",
  maxHeight: "82vh",
};

const heroImgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center 42%",
  display: "block",
};

const heroOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to top, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.42) 45%, rgba(15, 23, 42, 0.2) 100%)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: "clamp(20px, 4vw, 48px)",
  boxSizing: "border-box",
};

const heroTitleStyle = {
  margin: 0,
  color: "#FFFFFF",
  fontSize: "clamp(32px, 4.8vw, 52px)",
  lineHeight: 1.12,
  fontWeight: 800,
  textShadow: "0 2px 18px rgba(0,0,0,0.35)",
};

const heroAccentStyle = {
  color: "#FA8112",
};

const heroDescStyle = {
  margin: "12px 0 0",
  maxWidth: "980px",
  color: "rgba(255, 255, 255, 0.96)",
  fontSize: "clamp(14px, 1.8vw, 17px)",
  lineHeight: 1.65,
};

const contentShellStyle = {
  width: "100%",
  padding: "clamp(36px, 5.2vw, 62px) clamp(24px, 7vw, 78px) 90px",
  boxSizing: "border-box",
};

const contentMaxStyle = {
  width: "100%",
  maxWidth: "1360px",
  margin: "0 auto",
};

const cardStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "18px",
  border: "1px solid #E8E4DC",
  boxShadow: "0 10px 28px rgba(20, 33, 61, 0.08)",
  padding: "clamp(26px, 3.2vw, 46px)",
};

const sectionTitleStyle = {
  margin: "0 0 12px",
  color: "#14213D",
  fontSize: "clamp(20px, 2.3vw, 26px)",
  fontWeight: 800,
};

const paragraphStyle = {
  margin: "0 0 14px",
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.7,
};

const listStyle = {
  margin: "0 0 14px",
  paddingLeft: "22px",
  color: "#475569",
  fontSize: "15px",
  lineHeight: 1.75,
};

const metaRowStyle = {
  marginTop: "14px",
  paddingTop: "14px",
  borderTop: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

export default function PrivacyPolicyPage() {
  return (
    <main style={pageStyle}>
      <section style={heroWrapStyle} aria-label="Privacy policy">
        <img src={privacyHeroImage} alt="Campus library environment" style={heroImgStyle} />
        <div style={heroOverlayStyle}>
          <h1 style={heroTitleStyle}>
            Privacy <span style={heroAccentStyle}>Policy</span>
          </h1>
          <p style={heroDescStyle}>
            CampusSync is committed to protecting your personal data. This page explains what we collect, why we collect it,
            and how we safeguard your information while you use campus resources, bookings, and support services.
          </p>
        </div>
      </section>

      <section style={contentShellStyle}>
        <div style={contentMaxStyle}>
          <article style={cardStyle}>
            <h2 style={sectionTitleStyle}>1. Information We Collect</h2>
            <p style={paragraphStyle}>
              We may collect account details, contact information, booking and ticket records, and technical data required for
              secure login and service delivery.
            </p>
            <ul style={listStyle}>
              <li>Profile details such as name, email, and role</li>
              <li>Booking requests, schedules, and resource usage records</li>
              <li>Support tickets, messages, and service status updates</li>
              <li>Basic device and session information used for security</li>
            </ul>

            <h2 style={sectionTitleStyle}>2. How We Use Your Information</h2>
            <p style={paragraphStyle}>
              Your data is used to operate CampusSync features, improve service quality, and provide timely support. We only
              use information for legitimate campus operations and platform reliability.
            </p>

            <h2 style={sectionTitleStyle}>3. Data Protection and Access</h2>
            <p style={paragraphStyle}>
              CampusSync applies role-based access controls and reasonable technical safeguards to protect personal
              information from unauthorized access, disclosure, or misuse.
            </p>

            <h2 style={sectionTitleStyle}>4. Data Sharing</h2>
            <p style={paragraphStyle}>
              We do not sell personal data. Information is shared only when required to provide campus services, comply with
              legal obligations, or support authorized university operations.
            </p>

            <h2 style={sectionTitleStyle}>5. Your Rights</h2>
            <p style={paragraphStyle}>
              You may request updates to your personal data and contact support if you need clarification about data handling
              within CampusSync.
            </p>

            <h2 style={sectionTitleStyle}>6. Policy Updates</h2>
            <p style={paragraphStyle}>
              This privacy policy may be updated as services evolve. Material changes will be reflected on this page.
            </p>

            <div style={metaRowStyle}>
              Last updated: April 2026
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
