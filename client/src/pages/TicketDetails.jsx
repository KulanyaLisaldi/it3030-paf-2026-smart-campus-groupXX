import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addTicketComment,
  deleteTicket,
  deleteTicketComment,
  getTicketDetails,
  updateTicket,
  updateTicketComment,
} from "../api/tickets";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#FAF3E1",
  backgroundImage: "linear-gradient(180deg, #FAF3E1 0%, #FFFFFF 70%)",
  padding: "28px 16px",
  display: "flex",
  justifyContent: "center",
};

const containerStyle = {
  width: "100%",
  maxWidth: "960px",
  backgroundColor: "#FFFFFF",
  borderRadius: "12px",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  padding: "18px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
  padding: "12px 12px",
  borderRadius: "10px",
  border: "1px solid #F5E7C6",
  backgroundColor: "#FAF3E1",
};

const titleStyle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 700,
  color: "#222222",
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const chipBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const metaRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "10px",
};

const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#222222",
  marginBottom: "8px",
};

const cardStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "14px",
  backgroundColor: "#FFFFFF",
  marginBottom: "12px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "90px",
  resize: "vertical",
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const inputStyle = {
  width: "100%",
  border: "2px solid #F5E7C6",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const commentItemStyle = {
  border: "1px solid #F5E7C6",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "#FAF3E1",
};

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
  "Hostel",
  "Cafeteria",
  "Administration Office",
  "Parking Area",
  "Other",
];

const hasOnlyAllowedTextChars = (value) => /^[a-zA-Z0-9\s]+$/.test(value);
const hasTooManyRepeatedChars = (value) => /(.)\1{3,}/.test(value);

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

const getAdminDecisionMap = () => {
  try {
    const raw = localStorage.getItem("adminTicketDecisions");
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const applyAdminDecisionToDetails = (data) => {
  const decisionMap = getAdminDecisionMap();
  const ticketId = data?.ticket?.id;
  const decision = ticketId ? decisionMap[ticketId] : null;
  if (!decision?.status) return data;
  return {
    ...data,
    ticket: {
      ...data.ticket,
      status: decision.status,
      rejectionReason: decision.rejectionReason || "",
    },
  };
};

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => getCurrentUser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketDetails, setTicketDetails] = useState(null);

  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const [editingTicket, setEditingTicket] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    resourceLocation: "",
    category: "",
    issueTitle: "",
    description: "",
    priority: "",
  });
  const [commentEditingId, setCommentEditingId] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");

  const handleButtonHover = (event, isHover) => {
    event.target.style.backgroundColor = isHover ? "#E66A0A" : "#FA8112";
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getTicketDetails(id);
        const mergedData = applyAdminDecisionToDetails(data);
        setTicketDetails(mergedData);
        setTicketForm({
          fullName: mergedData?.ticket?.fullName || "",
          email: mergedData?.ticket?.email || "",
          phoneNumber: mergedData?.ticket?.phoneNumber || "",
          resourceLocation: mergedData?.ticket?.resourceLocation || "",
          category: mergedData?.ticket?.category || "",
          issueTitle: mergedData?.ticket?.issueTitle || "",
          description: mergedData?.ticket?.description || "",
          priority: mergedData?.ticket?.priority || "",
        });
      } catch (err) {
        setError(err.message || "Failed to load ticket details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const attachmentsRaw = ticketDetails?.ticket?.attachments || [];
  // Be defensive: Mongo list should return an array, but handle comma-separated string too.
  const attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw
    : typeof attachmentsRaw === "string"
      ? attachmentsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const comments = ticketDetails?.comments || [];

  const priorityChipBg =
    ticketDetails?.ticket?.priority === "High"
      ? "#d32f2f"
      : ticketDetails?.ticket?.priority === "Medium"
        ? "#FCA311"
        : "#2e7d32";

  const baseBackend = "http://localhost:8081";

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError("");
    setActionError("");

    const content = commentContent.trim();
    if (!content) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    if (!hasOnlyAllowedTextChars(content)) {
      setCommentError("Comment cannot contain special characters.");
      return;
    }
    if (hasTooManyRepeatedChars(content)) {
      setCommentError("Comment cannot repeat the same character many times.");
      return;
    }

    const createdBy = getFullName(user) || user?.email || "Unknown";

    try {
      setCommentSubmitting(true);
      await addTicketComment(id, { content, createdBy });
      setCommentContent("");
      // refresh ticket details
      const data = await getTicketDetails(id);
      setTicketDetails(data);
    } catch (err) {
      setCommentError(err.message || "Failed to add comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const refreshDetails = async () => {
    const data = await getTicketDetails(id);
    const mergedData = applyAdminDecisionToDetails(data);
    setTicketDetails(mergedData);
    return mergedData;
  };

  const handleTicketUpdate = async (e) => {
    e.preventDefault();
    setActionError("");
    try {
      setTicketSubmitting(true);
      await updateTicket(id, ticketForm);
      const data = await refreshDetails();
      setTicketForm({
        fullName: data?.ticket?.fullName || "",
        email: data?.ticket?.email || "",
        phoneNumber: data?.ticket?.phoneNumber || "",
        resourceLocation: data?.ticket?.resourceLocation || "",
        category: data?.ticket?.category || "",
        issueTitle: data?.ticket?.issueTitle || "",
        description: data?.ticket?.description || "",
        priority: data?.ticket?.priority || "",
      });
      setEditingTicket(false);
    } catch (err) {
      setActionError(err.message || "Failed to update ticket.");
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleDeleteTicket = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this ticket?");
    if (!confirmed) return;

    setActionError("");
    try {
      await deleteTicket(id);
      navigate("/my-tickets");
    } catch (err) {
      setActionError(err.message || "Failed to delete ticket.");
    }
  };

  const handleStartEditComment = (comment) => {
    setCommentEditingId(comment.id);
    setEditingCommentText(comment.content || "");
    setActionError("");
  };

  const handleSaveCommentEdit = async (commentId) => {
    const content = editingCommentText.trim();
    if (!content) {
      setActionError("Comment cannot be empty.");
      return;
    }
    if (!hasOnlyAllowedTextChars(content)) {
      setActionError("Comment cannot contain special characters.");
      return;
    }
    if (hasTooManyRepeatedChars(content)) {
      setActionError("Comment cannot repeat the same character many times.");
      return;
    }

    setActionError("");
    try {
      await updateTicketComment(id, commentId, { content });
      await refreshDetails();
      setCommentEditingId("");
      setEditingCommentText("");
    } catch (err) {
      setActionError(err.message || "Failed to update comment.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    setActionError("");
    try {
      await deleteTicketComment(id, commentId);
      await refreshDetails();
      if (commentEditingId === commentId) {
        setCommentEditingId("");
        setEditingCommentText("");
      }
    } catch (err) {
      setActionError(err.message || "Failed to delete comment.");
    }
  };

  return (
    <div style={pageStyle}>
      <section style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Ticket Details</h1>
          <button
            type="button"
            style={buttonStyle}
            onMouseEnter={(event) => handleButtonHover(event, true)}
            onMouseLeave={(event) => handleButtonHover(event, false)}
            onClick={() => navigate("/my-tickets")}
          >
            Back to My Tickets
          </button>
        </div>

        {loading && <p>Loading ticket...</p>}
        {!loading && error && <p style={{ color: "#d32f2f" }}>{error}</p>}
        {!loading && !error && actionError && <p style={{ color: "#d32f2f" }}>{actionError}</p>}

        {!loading && !error && ticketDetails?.ticket && (
          <>
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div style={sectionTitleStyle}>{ticketDetails.ticket.issueTitle}</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => setEditingTicket((prev) => !prev)}
                    onMouseEnter={(event) => handleButtonHover(event, true)}
                    onMouseLeave={(event) => handleButtonHover(event, false)}
                  >
                    {editingTicket ? "Cancel Edit" : "Edit Ticket"}
                  </button>
                  <button
                    type="button"
                    style={{ ...buttonStyle, backgroundColor: "#d32f2f" }}
                    onClick={handleDeleteTicket}
                  >
                    Delete Ticket
                  </button>
                </div>
              </div>
              <div style={metaRowStyle}>
                <span style={{ ...chipBaseStyle, backgroundColor: "#14213D", color: "#FFFFFF" }}>
                  Status: {ticketDetails.ticket.status}
                </span>
                <span style={{ ...chipBaseStyle, backgroundColor: priorityChipBg, color: "#FFFFFF" }}>
                  Priority: {ticketDetails.ticket.priority}
                </span>
                <span style={{ ...chipBaseStyle, backgroundColor: "#E5E5E5", color: "#14213D" }}>
                  Category: {ticketDetails.ticket.category}
                </span>
              </div>

              <p style={{ margin: "10px 0 0 0", color: "#374151", fontWeight: 700 }}>
                Location: <span style={{ fontWeight: 600 }}>{ticketDetails.ticket.resourceLocation}</span>
              </p>
              <div style={{ marginTop: "10px", color: "#374151", fontSize: "14px", fontWeight: 400, lineHeight: 1.5 }}>
                {ticketDetails.ticket.description}
              </div>
              {(ticketDetails.ticket.status || "").toUpperCase() === "REJECTED" && ticketDetails.ticket.rejectionReason && (
                <div
                  style={{
                    marginTop: "10px",
                    border: "1px solid #F5E7C6",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    backgroundColor: "#FAF3E1",
                  }}
                >
                  <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>Rejection Reason</div>
                  <div style={{ marginTop: "4px", color: "#d32f2f", fontSize: "14px", fontWeight: 600 }}>
                    {ticketDetails.ticket.rejectionReason}
                  </div>
                </div>
              )}

              {editingTicket && (
                <form onSubmit={handleTicketUpdate} style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                  <input
                    style={inputStyle}
                    value={ticketForm.fullName}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Full Name"
                  />
                  <input
                    style={inputStyle}
                    value={ticketForm.email}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                  />
                  <input
                    style={inputStyle}
                    value={ticketForm.phoneNumber}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Phone Number"
                  />
                  <select
                    style={inputStyle}
                    value={ticketForm.resourceLocation}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, resourceLocation: e.target.value }))}
                  >
                    <option value="">Select resource/location</option>
                    {RESOURCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    style={inputStyle}
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    style={inputStyle}
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="">Select priority</option>
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    style={inputStyle}
                    value={ticketForm.issueTitle}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, issueTitle: e.target.value }))}
                    placeholder="Issue Title"
                  />
                  <textarea
                    style={textareaStyle}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description"
                  />
                  <button type="submit" style={{ ...buttonStyle, width: "fit-content", opacity: ticketSubmitting ? 0.8 : 1 }} disabled={ticketSubmitting}>
                    {ticketSubmitting ? "Saving..." : "Save Ticket Changes"}
                  </button>
                </form>
              )}
            </div>

            <div style={cardStyle}>
              <div style={sectionTitleStyle}>Attachments</div>

              {attachments.length === 0 ? (
                <p style={{ margin: 0, color: "#6b7280" }}>No attachments.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {attachments.map((path, idx) => {
                    const src = path.startsWith("/uploads") ? `${baseBackend}${path}` : path;
                    return (
                      <div
                        key={`${path}-${idx}`}
                        style={{
                          flex: "1 1 200px",
                          maxWidth: "260px",
                          border: "1px solid #F5E7C6",
                          borderRadius: "12px",
                          padding: "8px",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <img
                          src={src}
                          style={{
                            width: "100%",
                            height: "120px",
                            objectFit: "contain",
                            borderRadius: "10px",
                            display: "block",
                            backgroundColor: "#FAF3E1",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={sectionTitleStyle}>Comments</div>

              {comments.length === 0 ? (
                <p style={{ margin: 0, color: "#6b7280" }}>No comments yet.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {comments.map((c) => (
                    <div key={c.id} style={commentItemStyle}>
                      <p style={{ margin: 0, fontWeight: 800, color: "#14213D" }}>{c.createdBy}</p>
                      {commentEditingId === c.id ? (
                        <>
                          <textarea
                            style={{ ...textareaStyle, marginTop: "6px" }}
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                          />
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button type="button" style={buttonStyle} onClick={() => handleSaveCommentEdit(c.id)}>
                              Save
                            </button>
                            <button type="button" style={{ ...buttonStyle, backgroundColor: "#6b7280" }} onClick={() => setCommentEditingId("")}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ margin: "6px 0 0 0", color: "#374151", fontSize: "14px", fontWeight: 400, lineHeight: 1.45 }}>{c.content}</p>
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button type="button" style={{ ...buttonStyle, minWidth: "96px" }} onClick={() => handleStartEditComment(c)}>
                              Edit
                            </button>
                            <button type="button" style={{ ...buttonStyle, minWidth: "96px", backgroundColor: "#d32f2f" }} onClick={() => handleDeleteComment(c.id)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} style={{ marginTop: "14px" }}>
                <div style={sectionTitleStyle}>Add Comment</div>
                <textarea
                  style={textareaStyle}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write your comment..."
                />
                {commentError && <p style={{ color: "#d32f2f", marginTop: "8px" }}>{commentError}</p>}
                <button
                  type="submit"
                  style={{ ...buttonStyle, marginTop: "10px", opacity: commentSubmitting ? 0.8 : 1 }}
                  disabled={commentSubmitting}
                  onMouseEnter={(event) => handleButtonHover(event, true)}
                  onMouseLeave={(event) => handleButtonHover(event, false)}
                >
                  {commentSubmitting ? "Adding..." : "Post Comment"}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

