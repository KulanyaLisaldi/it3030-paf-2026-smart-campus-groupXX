package com.example.server.service;

import com.example.server.dto.notification.NotificationPageResponse;
import com.example.server.dto.notification.NotificationRealtimePayload;
import com.example.server.model.Notification;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.notification.UserNotificationCategories;
import com.example.server.repository.NotificationRepo;
import com.example.server.repository.UserRepo;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepo notificationRepo;
    private final UserRepo userRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(
        NotificationRepo notificationRepo,
        UserRepo userRepo,
        SimpMessagingTemplate messagingTemplate
    ) {
        this.notificationRepo = notificationRepo;
        this.userRepo = userRepo;
        this.messagingTemplate = messagingTemplate;
    }

    public Notification createAndPush(
        String userIdRaw,
        String typeRaw,
        String titleRaw,
        String messageRaw,
        String entityTypeRaw,
        String entityIdRaw,
        String targetPathRaw
    ) {
        String userId = safeTrim(userIdRaw);
        if (userId.isEmpty()) return null;
        User user = userRepo.findById(userId).orElse(null);
        if (user == null || user.isDisabled()) {
            return null;
        }

        if (user.getEffectiveRole() == UserRole.USER) {
            String category = UserNotificationCategories.resolve(entityTypeRaw, typeRaw);
            if (!category.isEmpty() && isCategoryDisabledForUser(user, category)) {
                return null;
            }
        }

        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(safeTrim(typeRaw));
        n.setTitle(safeTrim(titleRaw));
        n.setMessage(safeTrim(messageRaw));
        n.setEntityType(safeTrim(entityTypeRaw));
        n.setEntityId(safeTrim(entityIdRaw));
        n.setTargetPath(safeTrim(targetPathRaw));
        n.setRead(false);
        n.setCreatedAt(Instant.now());
        Notification saved = notificationRepo.save(n);
        pushCreated(saved);
        return saved;
    }

    public void createForRole(
        UserRole role,
        String type,
        String title,
        String message,
        String entityType,
        String entityId,
        String targetPath
    ) {
        List<User> users = userRepo.findByRole(role);
        for (User user : users) {
            if (user == null || user.getId() == null) continue;
            createAndPush(user.getId(), type, title, message, entityType, entityId, targetPath);
        }
    }

    public List<Notification> listForUser(String userIdRaw, int limit) {
        String userId = safeTrim(userIdRaw);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        return notificationRepo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, safeLimit));
    }

    /**
     * Paginated notifications (newest first). Page is 0-based.
     */
    public NotificationPageResponse listForUserPage(String userIdRaw, int page, int size) {
        String userId = safeTrim(userIdRaw);
        int p = Math.max(0, page);
        int s = Math.max(1, Math.min(size, 100));
        long totalElements = notificationRepo.countByUserId(userId);
        List<Notification> content = notificationRepo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(p, s));
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / (double) s);
        return new NotificationPageResponse(content, totalElements, totalPages, p, s);
    }

    public long unreadCount(String userIdRaw) {
        String userId = safeTrim(userIdRaw);
        if (userId.isEmpty()) return 0;
        return notificationRepo.countByUserIdAndReadFalse(userId);
    }

    public Notification markRead(String userIdRaw, String notificationIdRaw) {
        String userId = safeTrim(userIdRaw);
        String notificationId = safeTrim(notificationIdRaw);
        Notification n = notificationRepo.findByIdAndUserId(notificationId, userId).orElse(null);
        if (n == null) {
            return null;
        }
        if (!n.isRead()) {
            n.setRead(true);
            n.setReadAt(Instant.now());
            n = notificationRepo.save(n);
        }
        return n;
    }

    public long markAllRead(String userIdRaw) {
        String userId = safeTrim(userIdRaw);
        List<Notification> unread = notificationRepo.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        if (unread.isEmpty()) return 0;
        Instant now = Instant.now();
        for (Notification n : unread) {
            n.setRead(true);
            n.setReadAt(now);
        }
        notificationRepo.saveAll(unread);
        return unread.size();
    }

    private void pushCreated(Notification notification) {
        long unreadCount = unreadCount(notification.getUserId());
        NotificationRealtimePayload payload = new NotificationRealtimePayload(
            "NOTIFICATION_CREATED",
            notification,
            unreadCount
        );
        messagingTemplate.convertAndSendToUser(notification.getUserId(), "/queue/notifications", payload);
    }

    private static String safeTrim(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private static boolean isCategoryDisabledForUser(User user, String category) {
        if (user.getNotificationDisabledCategories() == null || user.getNotificationDisabledCategories().isEmpty()) {
            return false;
        }
        for (String c : user.getNotificationDisabledCategories()) {
            if (category.equalsIgnoreCase(safeTrim(c))) {
                return true;
            }
        }
        return false;
    }
}
