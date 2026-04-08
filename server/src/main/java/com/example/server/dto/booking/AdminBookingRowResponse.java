package com.example.server.dto.booking;

import com.example.server.model.Booking;

import java.time.Instant;

public class AdminBookingRowResponse {
    private final String id;
    private final String userEmail;
    private final String userName;
    private final String resourceId;
    private final String resourceName;
    private final String resourceType;
    private final String bookingDate;
    private final String startTime;
    private final String endTime;
    private final String status;
    private final String purpose;
    private final Integer expectedAttendees;
    private final String additionalNotes;
    private final String reviewReason;
    private final String cancellationReason;
    private final Instant createdAt;
    private final Instant updatedAt;

    public AdminBookingRowResponse(Booking booking, String userName, String userEmail) {
        this.id = booking.getId();
        this.userEmail = userEmail;
        this.userName = userName;
        this.resourceId = booking.getResourceId();
        this.resourceName = booking.getResourceName();
        this.resourceType = booking.getResourceType();
        this.bookingDate = booking.getBookingDate();
        this.startTime = booking.getStartTime();
        this.endTime = booking.getEndTime();
        this.status = booking.getStatus();
        this.purpose = booking.getPurpose();
        this.expectedAttendees = booking.getExpectedAttendees();
        this.additionalNotes = booking.getAdditionalNotes();
        this.reviewReason = booking.getReviewReason();
        this.cancellationReason = booking.getCancellationReason();
        this.createdAt = booking.getCreatedAt();
        this.updatedAt = booking.getUpdatedAt();
    }

    public String getId() { return id; }
    public String getUserEmail() { return userEmail; }
    public String getUserName() { return userName; }
    public String getResourceId() { return resourceId; }
    public String getResourceName() { return resourceName; }
    public String getResourceType() { return resourceType; }
    public String getBookingDate() { return bookingDate; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public String getStatus() { return status; }
    public String getPurpose() { return purpose; }
    public Integer getExpectedAttendees() { return expectedAttendees; }
    public String getAdditionalNotes() { return additionalNotes; }
    public String getReviewReason() { return reviewReason; }
    public String getCancellationReason() { return cancellationReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
