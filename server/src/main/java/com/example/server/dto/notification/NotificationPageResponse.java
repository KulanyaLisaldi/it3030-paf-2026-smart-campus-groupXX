package com.example.server.dto.notification;

import com.example.server.model.Notification;

import java.util.List;

public record NotificationPageResponse(
    List<Notification> content,
    long totalElements,
    int totalPages,
    int page,
    int size
) {}
