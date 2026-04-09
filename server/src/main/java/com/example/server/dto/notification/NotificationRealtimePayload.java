package com.example.server.dto.notification;

import com.example.server.model.Notification;

public class NotificationRealtimePayload {
    private String event;
    private Notification notification;
    private long unreadCount;

    public NotificationRealtimePayload() {
    }

    public NotificationRealtimePayload(String event, Notification notification, long unreadCount) {
        this.event = event;
        this.notification = notification;
        this.unreadCount = unreadCount;
    }

    public String getEvent() {
        return event;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public Notification getNotification() {
        return notification;
    }

    public void setNotification(Notification notification) {
        this.notification = notification;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(long unreadCount) {
        this.unreadCount = unreadCount;
    }
}
