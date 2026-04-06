import React from "react";
import { appFontFamily } from "../utils/appFont";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FFFFFF",
  fontFamily: appFontFamily,
  padding: "32px 16px",
  boxSizing: "border-box",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1120px",
  margin: "0 auto",
  border: "1px solid #E8E4DC",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 12px 28px rgba(20, 33, 61, 0.08)",
  backgroundColor: "#FFFFFF",
};

const heroStyle = {
  background: "linear-gradient(135deg, #14213D 0%, #1f3358 100%)",
  color: "#FFFFFF",
  padding: "30px 28px",
};

const heroTitleStyle = {
  margin: 0,
  fontSize: "clamp(26px, 3.8vw, 36px)",
  fontWeight: 800,
  lineHeight: 1.1,
};

const heroDescStyle = {
  margin: "10px 0 0 0",
  maxWidth: "760px",
  color: "rgba(255,255,255,0.88)",
  fontSize: "15px",
  lineHeight: 1.6,
};

const bodyStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 360px) minmax(0, 1fr)",
  gap: "22px",
  padding: "24px",
};

const cardStyle = {
  border: "1px solid #E8E4DC",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#FFFFFF",
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "18px",
  color: "#14213D",
  fontWeight: 800,
};

const mutedTextStyle = {
  margin: "8px 0 0 0",
  color: "#64748B",
  fontSize: "14px",
  lineHeight: 1.5,
};

const infoLabelStyle = {
  margin: "0 0 2px 0",
  color: "#6B7280",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const infoValueStyle = {
  margin: 0,
  color: "#1F2937",
  fontSize: "15px",
  fontWeight: 600,
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const labelStyle = {
  display: "block",
  color: "#374151",
  fontSize: "13px",
  fontWeight: 700,
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  backgroundColor: "#FFFFFF",
  color: "#1F2937",
  fontSize: "14px",
  padding: "11px 12px",
  outline: "none",
  fontFamily: appFontFamily,
};

const submitButtonStyle = {
  marginTop: "14px",
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "10px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: appFontFamily,
};

const footerNoteStyle = {
  marginTop: "12px",
  color: "#6B7280",
  fontSize: "12px",
  lineHeight: 1.45,
};

export default function ContactUs() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <h1 style={heroTitleStyle}>Contact Support Desk</h1>
          <p style={heroDescStyle}>
            Reach our Smart Campus support team for technical help, service requests, and account-related
            assistance. We typically respond within one business day.
          </p>
        </div>

        <div style={bodyStyle}>
          <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Support Information</h2>
              <p style={mutedTextStyle}>Use these channels for urgent and non-urgent assistance.</p>
              <div style={{ marginTop: "14px", display: "grid", gap: "12px" }}>
                <div>
                  <p style={infoLabelStyle}>Email</p>
                  <p style={infoValueStyle}>supportdesk@campus.edu</p>
                </div>
                <div>
                  <p style={infoLabelStyle}>Phone</p>
                  <p style={infoValueStyle}>+94 11 234 5678</p>
                </div>
                <div>
                  <p style={infoLabelStyle}>Office Hours</p>
                  <p style={infoValueStyle}>Mon - Fri, 8:30 AM - 5:30 PM</p>
                </div>
                <div>
                  <p style={infoLabelStyle}>Support Office</p>
                  <p style={infoValueStyle}>IT Services Center, Building A</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>Guidance</h2>
              <p style={mutedTextStyle}>
                For faster help, include your location, the issue summary, and any relevant screenshots or
                error messages.
              </p>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Send Us a Message</h2>
            <p style={mutedTextStyle}>
              Complete this form and our Support Desk will get back to you with a clear next step.
            </p>

            <form onSubmit={(e) => e.preventDefault()} aria-label="Contact support form">
              <div style={formGridStyle}>
                <div>
                  <label htmlFor="contact-first-name" style={labelStyle}>
                    First name
                  </label>
                  <input id="contact-first-name" name="firstName" type="text" style={inputStyle} placeholder="Enter first name" />
                </div>
                <div>
                  <label htmlFor="contact-last-name" style={labelStyle}>
                    Last name
                  </label>
                  <input id="contact-last-name" name="lastName" type="text" style={inputStyle} placeholder="Enter last name" />
                </div>
                <div>
                  <label htmlFor="contact-email" style={labelStyle}>
                    Email address
                  </label>
                  <input id="contact-email" name="email" type="email" style={inputStyle} placeholder="name@campus.edu" />
                </div>
                <div>
                  <label htmlFor="contact-phone" style={labelStyle}>
                    Phone number
                  </label>
                  <input id="contact-phone" name="phone" type="tel" style={inputStyle} placeholder="+94 xx xxx xxxx" />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label htmlFor="contact-subject" style={labelStyle}>
                  Subject
                </label>
                <input id="contact-subject" name="subject" type="text" style={inputStyle} placeholder="Brief summary of your request" />
              </div>

              <div style={{ marginTop: "12px" }}>
                <label htmlFor="contact-message" style={labelStyle}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={7}
                  style={{ ...inputStyle, resize: "vertical", minHeight: "130px" }}
                  placeholder="Describe your issue or request in detail..."
                />
              </div>

              <button type="submit" style={submitButtonStyle}>
                Submit Request
              </button>
              <p style={footerNoteStyle}>
                This page provides the professional form structure only. You can connect submission handling
                to your backend later without changing the visual layout.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
