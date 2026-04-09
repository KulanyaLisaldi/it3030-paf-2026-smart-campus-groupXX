import React, { useState } from "react";
import { Link } from "react-router-dom";
import { appFontFamily } from "../utils/appFont";
import faqHeroImage from "../assets/faq-hero-students-new.png";

const pageStyle = {
  width: "100%",
  minHeight: "100vh",
  backgroundColor: "#f8fafc",
  fontFamily: appFontFamily,
  padding: "0 0 80px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  overflowX: "hidden",
};

const wrapStyle = {
  width: "100%",
  maxWidth: "1220px",
  margin: "34px auto 0",
  padding: "0 clamp(24px, 5vw, 64px)",
  boxSizing: "border-box",
};

const heroWrapStyle = {
  position: "relative",
  width: "100%",
  minHeight: "min(52vh, 560px)",
  maxHeight: "70vh",
  overflow: "hidden",
};

const heroImgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center 20%",
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

const heroStatsRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "40px",
};

const heroStatStyle = {
  background: "#0f2742",
  borderRadius: "12px",
  padding: "14px 16px",
  color: "#FFFFFF",
  border: "1px solid rgba(250, 129, 18, 0.35)",
};

const introCardStyle = {
  marginBottom: "34px",
  background: "#FFFFFF",
  border: "1px solid #E8E4DC",
  borderRadius: "18px",
  padding: "28px clamp(22px, 3.2vw, 42px)",
  display: "block",
};

const miniInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const cardStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "18px",
  border: "1px solid #E8E4DC",
  boxShadow: "0 12px 32px rgba(20, 33, 61, 0.07)",
  overflow: "hidden",
  width: "100%",
};

const itemBtnStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "20px clamp(18px, 3vw, 32px)",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  background: "#FFFFFF",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  fontSize: "16px",
  fontWeight: 700,
  color: "#14213D",
  transition: "background 0.15s ease",
  lineHeight: 1.35,
};

/** Aligns with question text: horizontal padding + chevron (28px) + gap (12px) */
const answerPadLeft = "calc(clamp(18px, 3vw, 32px) + 40px)";

const answerStyle = {
  margin: 0,
  padding: `0 clamp(18px, 3vw, 32px) 22px ${answerPadLeft}`,
  fontSize: "15px",
  lineHeight: 1.65,
  color: "#475569",
  maxWidth: "52rem",
};

const chevronStyle = (open) => ({
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: "8px",
  background: open ? "#FFF4E6" : "#f1f5f9",
  color: open ? "#c2410c" : "#64748b",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1,
});

const ctaBoxStyle = {
  marginTop: "44px",
  padding: "32px clamp(24px, 4vw, 44px)",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #14213D 0%, #1e3a5f 100%)",
  color: "#F5E7C6",
  textAlign: "center",
  maxWidth: "1220px",
  marginLeft: "auto",
  marginRight: "auto",
  boxSizing: "border-box",
};

const ctaLinkStyle = {
  display: "inline-block",
  marginTop: "16px",
  padding: "12px 22px",
  borderRadius: "10px",
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "15px",
  textDecoration: "none",
};

const FAQ_ITEMS = [
  {
    q: "How do I book a room or resource?",
    a: "Open Resources from the main menu, pick a facility, and use the booking flow to choose a date and time. Submit your request; some bookings may need admin approval before they are confirmed.",
  },
  {
    q: "How do I report a maintenance issue?",
    a: "Use Create Ticket (or My Tickets) to describe the problem, location, and category. You can track status and messages on your ticket after it is submitted.",
  },
  {
    q: "Why was my booking rejected or still pending?",
    a: "Admins may reject bookings if there is a conflict, the resource is unavailable, or details need correction. Pending means it is awaiting review—check your notifications or contact support if it takes too long.",
  },
  {
    q: "How do I sign in with Google?",
    a: "On the sign-in page, choose the Google option and complete the provider flow. Use the same email you expect on your CampusSync profile so your bookings and tickets stay linked.",
  },
  {
    q: "Where can I update my profile or phone number?",
    a: "Signed-in campus users can open Account from the profile area to view personal details and update allowed fields such as phone number, depending on your role.",
  },
  {
    q: "Who can I contact for more help?",
    a: "Use the Contact page for Support Service Center details or to send a message. Include your issue, resource or ticket ID if you have one so we can assist faster.",
  },
];

export default function FaqPage() {
  const [openId, setOpenId] = useState(0);

  return (
    <main style={pageStyle}>
      <section style={heroWrapStyle} aria-label="FAQ hero">
        <img src={faqHeroImage} alt="Campus students" style={heroImgStyle} />
        <div style={heroOverlayStyle}>
          <h1 style={heroTitleStyle}>
            Healp/FAQ <span style={heroAccentStyle}>CampusSync</span>
          </h1>
          <p style={heroDescStyle}>
            CampusSync is your campus operations hub-bringing resources, bookings, and support tickets together in one place so students and staff can get things done without juggling disconnected tools.
          </p>
        </div>
      </section>

      <div style={wrapStyle}>
        <div style={heroStatsRowStyle}>
          <div style={heroStatStyle}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>200+</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>Frequently asked topics</p>
          </div>
          <div style={heroStatStyle}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>24/7</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>Self-service support access</p>
          </div>
          <div style={heroStatStyle}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>1K+</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>Student help requests handled</p>
          </div>
        </div>

        <section style={introCardStyle} aria-label="About FAQ help center">
          <div>
            <p style={{ margin: 0, color: "#FA8112", fontWeight: 700, fontSize: 13, letterSpacing: "0.03em" }}>ABOUT FAQ SUPPORT</p>
            <h2 style={{ margin: "10px 0 0", color: "#14213D", fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.25 }}>
              Fast answers for campus life
            </h2>
            <p style={{ margin: "12px 0 0", color: "#475569", fontSize: 15, lineHeight: 1.65 }}>
              We organized common questions by student actions, so you can quickly solve booking, profile, and ticket issues without leaving the page.
            </p>
            <div style={miniInfoGridStyle}>
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ margin: 0, color: "#9A3412", fontWeight: 700, fontSize: 13 }}>Booking Guidance</p>
              </div>
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ margin: 0, color: "#9A3412", fontWeight: 700, fontSize: 13 }}>Ticket Support Flow</p>
              </div>
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 12px" }}>
                <p style={{ margin: 0, color: "#9A3412", fontWeight: 700, fontSize: 13 }}>Account Help</p>
              </div>
            </div>
          </div>
        </section>

        <div style={cardStyle} role="region" aria-label="Frequently asked questions">
          {FAQ_ITEMS.map((item, index) => {
            const open = openId === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  id={`faq-q-${index}`}
                  aria-expanded={open}
                  aria-controls={`faq-a-${index}`}
                  onClick={() => setOpenId(open ? -1 : index)}
                  style={{
                    ...itemBtnStyle,
                    background: open ? "#FFFBF5" : "#FFFFFF",
                    borderBottom: index === FAQ_ITEMS.length - 1 && !open ? "none" : itemBtnStyle.borderBottom,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%" }}>
                    <span style={chevronStyle(open)} aria-hidden>{open ? "−" : "+"}</span>
                    <span style={{ flex: 1, paddingTop: 1 }}>{item.q}</span>
                  </span>
                </button>
                {open ? (
                  <div id={`faq-a-${index}`} role="region" aria-labelledby={`faq-q-${index}`}>
                    <p style={answerStyle}>{item.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={ctaBoxStyle}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#FFFFFF" }}>Still need help?</p>
          <p style={{ margin: "10px auto 0", fontSize: 15, maxWidth: "560px", color: "rgba(245, 231, 198, 0.92)", lineHeight: 1.55 }}>
            Our support team is happy to answer questions about bookings, tickets, or campus resources.
          </p>
          <Link to="/contact" style={ctaLinkStyle}>
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
