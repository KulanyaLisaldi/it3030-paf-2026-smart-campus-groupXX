import React from "react";
import { appFontFamily } from "../utils/appFont";
import termsHeroImage from "../assets/terms-of-use-hero.png";

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
  minHeight: "min(58vh, 660px)",
  maxHeight: "78vh",
};

const heroImgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center 30%",
  display: "block",
};

const heroOverlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(to top, rgba(15, 23, 42, 0.78) 0%, rgba(15, 23, 42, 0.38) 45%, rgba(15, 23, 42, 0.2) 100%)",
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
  maxWidth: "940px",
  color: "rgba(255, 255, 255, 0.95)",
  fontSize: "clamp(14px, 1.8vw, 17px)",
  lineHeight: 1.65,
};

const contentShellStyle = {
  width: "100%",
  padding: "clamp(34px, 4.8vw, 58px) clamp(20px, 6vw, 68px) 76px",
  boxSizing: "border-box",
};

const contentMaxStyle = {
  width: "100%",
  maxWidth: "1260px",
  margin: "0 auto",
};

const cardStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "18px",
  border: "1px solid #E8E4DC",
  boxShadow: "0 10px 28px rgba(20, 33, 61, 0.08)",
  padding: "clamp(22px, 2.9vw, 38px)",
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

export default function TermsOfUsePage() {
  return (
    <main style={pageStyle}>
      <section style={heroWrapStyle} aria-label="Terms of use">
        <img src={termsHeroImage} alt="Campus technology learning space" style={heroImgStyle} />
        <div style={heroOverlayStyle}>
          <h1 style={heroTitleStyle}>
            Terms of <span style={heroAccentStyle}>Use</span>
          </h1>
          <p style={heroDescStyle}>
            These terms explain the rules for using CampusSync services, including resource bookings, support tickets, and
            account responsibilities. By using this platform, you agree to follow these conditions.
          </p>
        </div>
      </section>

      <section style={contentShellStyle}>
        <div style={contentMaxStyle}>
          <article style={cardStyle}>
            <h2 style={sectionTitleStyle}>1. Acceptance of Terms</h2>
            <p style={paragraphStyle}>
              By accessing CampusSync, you agree to comply with these Terms of Use and applicable university policies. If you
              do not agree, please discontinue use of the platform.
            </p>

            <h2 style={sectionTitleStyle}>2. Account Responsibilities</h2>
            <ul style={listStyle}>
              <li>Use accurate account information and keep your credentials secure.</li>
              <li>Do not share your account or attempt unauthorized access.</li>
              <li>Report suspicious activity or account misuse promptly.</li>
            </ul>

            <h2 style={sectionTitleStyle}>3. Acceptable Use</h2>
            <p style={paragraphStyle}>
              CampusSync must be used for legitimate academic and campus operations. Users must not abuse booking systems,
              submit false tickets, or disrupt platform availability.
            </p>

            <h2 style={sectionTitleStyle}>4. Bookings and Support Services</h2>
            <p style={paragraphStyle}>
              Booking confirmations, approvals, and ticket responses depend on resource availability and campus workflows.
              CampusSync reserves the right to reject or modify requests that violate policy.
            </p>

            <h2 style={sectionTitleStyle}>5. Content and Conduct</h2>
            <p style={paragraphStyle}>
              Users are responsible for submitted messages, ticket details, and attachments. Any abusive, misleading, or
              harmful content may result in account restrictions.
            </p>

            <h2 style={sectionTitleStyle}>6. Changes and Termination</h2>
            <p style={paragraphStyle}>
              These terms may be updated as campus requirements evolve. Continued use after updates indicates acceptance of
              revised terms.
            </p>

            <div style={metaRowStyle}>Last updated: April 2026</div>
          </article>
        </div>
      </section>
    </main>
  );
}
