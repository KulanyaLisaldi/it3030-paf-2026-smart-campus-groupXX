package com.example.server.controller;

import com.example.server.dto.notification.NotificationPageResponse;
import com.example.server.model.Notification;
import com.example.server.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<Notification> list(
        Authentication authentication,
        @RequestParam(value = "limit", defaultValue = "50") int limit
    ) {
        return notificationService.listForUser(authentication.getName(), limit);
    }

    @GetMapping("/page")
    public NotificationPageResponse listPage(
        Authentication authentication,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "size", defaultValue = "15") int size
    ) {
        return notificationService.listForUserPage(authentication.getName(), page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication authentication) {
        return Map.of("unreadCount", notificationService.unreadCount(authentication.getName()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(Authentication authentication, @PathVariable("id") String id) {
        Notification updated = notificationService.markRead(authentication.getName(), id);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Notification not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Notification marked as read", "notification", updated));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication authentication) {
        long updated = notificationService.markAllRead(authentication.getName());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read", "updated", updated));
    }
}
