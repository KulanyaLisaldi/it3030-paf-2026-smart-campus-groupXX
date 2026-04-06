package com.example.server.model;

import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "tickets")
public class Ticket {

    @Id
    private String id;

    private String fullName;
    private String email;
    private String phoneNumber;
    private String resourceLocation;
    private String category;
    private String issueTitle;
    private String description;
    private String priority;
    private List<String> attachments = new ArrayList<>();
    private String status;
    /** User id (Mongo) or email fallback for the assigned technician. */
    private String assignedTechnicianId;
    private String assignedTechnicianName;
    private String createdBy;
    private Instant createdAt;
    private String resolutionDetails;
    /** Set when the first qualifying response occurs (assignment, first comment, or first chat message). */
    private Instant firstResponseAt;
    /** Set when the ticket is marked RESOLVED. */
    private Instant resolvedAt;
    /** Set when an administrator assigns a technician (accept flow). */
    private Instant technicianAssignedAt;
    /** Set when an administrator rejects an open ticket. */
    private String rejectionReason;

    public Ticket() {
    }

    public String getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getResourceLocation() {
        return resourceLocation;
    }

    public void setResourceLocation(String resourceLocation) {
        this.resourceLocation = resourceLocation;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getIssueTitle() {
        return issueTitle;
    }

    public void setIssueTitle(String issueTitle) {
        this.issueTitle = issueTitle;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public List<String> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<String> attachments) {
        this.attachments = attachments;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedTechnicianId() {
        return assignedTechnicianId;
    }

    public void setAssignedTechnicianId(String assignedTechnicianId) {
        this.assignedTechnicianId = assignedTechnicianId;
    }

    public String getAssignedTechnicianName() {
        return assignedTechnicianName;
    }

    public void setAssignedTechnicianName(String assignedTechnicianName) {
        this.assignedTechnicianName = assignedTechnicianName;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getResolutionDetails() {
        return resolutionDetails;
    }

    public void setResolutionDetails(String resolutionDetails) {
        this.resolutionDetails = resolutionDetails;
    }

    public Instant getFirstResponseAt() {
        return firstResponseAt;
    }

    public void setFirstResponseAt(Instant firstResponseAt) {
        this.firstResponseAt = firstResponseAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public Instant getTechnicianAssignedAt() {
        return technicianAssignedAt;
    }

    public void setTechnicianAssignedAt(Instant technicianAssignedAt) {
        this.technicianAssignedAt = technicianAssignedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    /** Duration from ticket creation to first response (TFR). Null if no first response yet. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonGetter
    public Long getTimeToFirstResponseSeconds() {
        if (createdAt == null || firstResponseAt == null) {
            return null;
        }
        return Duration.between(createdAt, firstResponseAt).getSeconds();
    }

    /** Duration from ticket creation to resolution (TTR). Null if not resolved yet. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonGetter
    public Long getTimeToResolutionSeconds() {
        if (createdAt == null || resolvedAt == null) {
            return null;
        }
        return Duration.between(createdAt, resolvedAt).getSeconds();
    }
}
