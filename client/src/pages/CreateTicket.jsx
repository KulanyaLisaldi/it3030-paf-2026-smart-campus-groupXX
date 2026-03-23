import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../api/tickets";

const CATEGORY_OPTIONS = [
  "Electrical Issue",
  "Network Issue",
  "Equipment Issue",
  "Software Issue",
  "Facility Issue",
  "Maintenance Issue",
  "Other",
];

const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const RESOURCE_OPTIONS = [
  "Library",
  "Computer Lab",
  "Lecture Hall",
  "Cafeteria",
  "Other",
];

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("smartCampusUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getFullName = (user) => {
  if (!user) return "";
  if (user.fullName && user.fullName.trim()) return user.fullName.trim();
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  return `${firstName} ${lastName}`.trim();
};

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  display: "flex",
  justifyContent: "center",
  padding: "28px 16px",
};

const formCardStyle = {
  width: "100%",
  maxWidth: "900px",
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  padding: "24px",
};

const sectionStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "10px",
  padding: "18px",
  marginBottom: "16px",
};

const headingStyle = {
  fontSize: "24px",
  fontWeight: 700,
  marginBottom: "16px",
  color: "#222222",
};

const sectionTitleStyle = {
  margin: "0 0 14px 0",
  fontSize: "18px",
  fontWeight: 600,
  color: "#222222",
};

const fieldRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "12px",
  marginBottom: "12px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const inputStyle = {
  border: "2px solid #F5E7C6",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#222222",
};

const errorStyle = {
  color: "#d32f2f",
  fontSize: "12px",
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  fontWeight: 600,
  cursor: "pointer",
};

const hasOnlyAllowedTextChars = (value) => /^[a-zA-Z0-9\s]+$/.test(value);
const hasTooManyRepeatedChars = (value) => /(.)\1{3,}/.test(value);

export default function CreateTicket() {
  const navigate = useNavigate();
  const user = useMemo(() => getCurrentUser(), []);

  const [formData, setFormData] = useState({
    fullName: getFullName(user),
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    resourceLocation: "",
    category: "",
    issueTitle: "",
    description: "",
    priority: "",
  });
  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createdBy = user?.id || user?.email || formData.email;

  const handleButtonHover = (event, isHover) => {
    event.target.style.backgroundColor = isHover ? "#E66A0A" : "#FA8112";
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const onAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    const mergedFiles = [...attachments, ...files];

    if (mergedFiles.some((file) => !file.type.startsWith("image/"))) {
      setErrors((prev) => ({ ...prev, attachments: "Only image files are allowed." }));
      event.target.value = "";
      return;
    }

    if (mergedFiles.length > 3) {
      setErrors((prev) => ({ ...prev, attachments: "You can upload up to 3 images only." }));
      event.target.value = "";
      return;
    }

    setErrors((prev) => ({ ...prev, attachments: "" }));
    setAttachments(mergedFiles);
    event.target.value = "";
  };

  const validate = () => {
    const next = {};
    if (!formData.fullName.trim()) next.fullName = "Full name is required.";
    if (!formData.email.trim()) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = "Please enter a valid email address.";
    }

    if (!formData.phoneNumber.trim()) {
      next.phoneNumber = "Phone number is required.";
    } else if (!/^[0-9+\-()\s]{7,20}$/.test(formData.phoneNumber.trim())) {
      next.phoneNumber = "Please enter a valid phone number.";
    }

    if (!formData.resourceLocation) next.resourceLocation = "Resource/Location is required.";
    if (!formData.category) next.category = "Category is required.";
    if (!formData.issueTitle.trim()) {
      next.issueTitle = "Issue title is required.";
    } else if (!hasOnlyAllowedTextChars(formData.issueTitle.trim())) {
      next.issueTitle = "Issue title cannot contain special characters.";
    } else if (hasTooManyRepeatedChars(formData.issueTitle.trim())) {
      next.issueTitle = "Issue title cannot repeat the same character many times.";
    }

    if (!formData.description.trim()) {
      next.description = "Description is required.";
    } else if (!hasOnlyAllowedTextChars(formData.description.trim())) {
      next.description = "Description cannot contain special characters.";
    } else if (hasTooManyRepeatedChars(formData.description.trim())) {
      next.description = "Description cannot repeat the same character many times.";
    }
    if (!formData.priority) next.priority = "Priority is required.";
    if (!createdBy || !createdBy.trim()) next.createdBy = "Please sign in before creating a ticket.";
    if (attachments.length > 3) next.attachments = "You can upload up to 3 images only.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    const payload = new FormData();
    Object.entries({
      ...formData,
      createdBy: createdBy.trim(),
    }).forEach(([key, value]) => payload.append(key, value.trim()));

    attachments.forEach((file) => payload.append("attachments", file));

    try {
      setSubmitting(true);
      await createTicket(payload);
      navigate("/my-tickets", { state: { createdSuccess: true } });
    } catch (error) {
      const message = error.message || "Failed to create ticket.";
      if (message.includes("404")) {
        setSubmitError("Ticket API endpoint was not found. Please restart the backend server and try again.");
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <form style={formCardStyle} onSubmit={handleSubmit}>
        <h1 style={headingStyle}>Create Ticket</h1>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Contact Details</h2>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Full Name</label>
              <input
                style={inputStyle}
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={onChange}
              />
              {errors.fullName && <span style={errorStyle}>{errors.fullName}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email Address</label>
              <input
                style={inputStyle}
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={onChange}
              />
              {errors.email && <span style={errorStyle}>{errors.email}</span>}
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Phone Number</label>
            <input
              style={inputStyle}
              type="tel"
              name="phoneNumber"
              placeholder="Enter your phone number"
              value={formData.phoneNumber}
              onChange={onChange}
            />
            {errors.phoneNumber && <span style={errorStyle}>{errors.phoneNumber}</span>}
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Ticket Details</h2>
          <div style={fieldRowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Resource / Location</label>
              <select style={inputStyle} name="resourceLocation" value={formData.resourceLocation} onChange={onChange}>
                <option value="">Select resource/location</option>
                {RESOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.resourceLocation && <span style={errorStyle}>{errors.resourceLocation}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} name="category" value={formData.category} onChange={onChange}>
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.category && <span style={errorStyle}>{errors.category}</span>}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Issue Title</label>
            <input
              style={inputStyle}
              type="text"
              name="issueTitle"
              placeholder="Brief title of the issue"
              value={formData.issueTitle}
              onChange={onChange}
            />
            {errors.issueTitle && <span style={errorStyle}>{errors.issueTitle}</span>}
          </div>

          <div style={{ ...fieldStyle, marginTop: "12px" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
              name="description"
              placeholder="Describe the issue in detail"
              value={formData.description}
              onChange={onChange}
            />
            {errors.description && <span style={errorStyle}>{errors.description}</span>}
          </div>

          <div style={{ ...fieldStyle, marginTop: "12px", maxWidth: "320px" }}>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} name="priority" value={formData.priority} onChange={onChange}>
              <option value="">Select priority</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.priority && <span style={errorStyle}>{errors.priority}</span>}
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Attachments</h2>
          <div style={fieldStyle}>
            <label style={labelStyle}>Upload Images (max 3)</label>
            <input
              style={inputStyle}
              type="file"
              accept="image/*"
              multiple
              onChange={onAttachmentChange}
            />
            <span style={{ fontSize: "12px", color: "#555555" }}>
              Only image files are allowed.
            </span>
            <span style={{ fontSize: "12px", color: "#555555" }}>
              Selected: {attachments.length}/3
            </span>
            {errors.attachments && <span style={errorStyle}>{errors.attachments}</span>}
          </div>
        </section>

        {errors.createdBy && <p style={{ ...errorStyle, marginBottom: "8px" }}>{errors.createdBy}</p>}
        {submitError && <p style={{ ...errorStyle, marginBottom: "8px" }}>{submitError}</p>}

        <button
          type="submit"
          style={{ ...buttonStyle, opacity: submitting ? 0.8 : 1 }}
          onMouseEnter={(event) => handleButtonHover(event, true)}
          onMouseLeave={(event) => handleButtonHover(event, false)}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
