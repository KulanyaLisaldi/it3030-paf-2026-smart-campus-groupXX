import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addTicketComment, getTicketDetails } from "../api/tickets";

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
  fontWeight: 900,
  color: "#14213D",
};

const buttonStyle = {
  backgroundColor: "#FA8112",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  fontWeight: 800,
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
  fontWeight: 900,
  color: "#14213D",
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

  const handleButtonHover = (event, isHover) => {
    event.target.style.backgroundColor = isHover ? "#E66A0A" : "#FA8112";
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getTicketDetails(id);
        setTicketDetails(data);
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

    const content = commentContent.trim();
    if (!content) {
      setCommentError("Comment cannot be empty.");
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

        {!loading && !error && ticketDetails?.ticket && (
          <>
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>{ticketDetails.ticket.issueTitle}</div>
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
              <div style={{ marginTop: "10px", color: "#374151", lineHeight: 1.5 }}>
                {ticketDetails.ticket.description}
              </div>
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
                      <p style={{ margin: "6px 0 0 0", color: "#374151", lineHeight: 1.45 }}>{c.content}</p>
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

