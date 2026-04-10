package com.example.server.notification;

import java.util.Locale;
import java.util.Set;

/**
 * In-app notification categories that {@link com.example.server.model.UserRole#USER} accounts may mute.
 */
public final class UserNotificationCategories {

    public static final Set<String> ALLOWED = Set.of("BOOKING", "TICKET");

    private UserNotificationCategories() {
    }

    /**
     * Maps a stored notification's entity type / type string to a preference category, or "" if unknown.
     */
    public static String resolve(String entityType, String type) {
        String et = entityType == null ? "" : entityType.trim().toUpperCase(Locale.ROOT);
        if (ALLOWED.contains(et)) {
            return et;
        }
        String t = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        if (t.startsWith("BOOKING_")) {
            return "BOOKING";
        }
        if (t.startsWith("TICKET_")) {
            return "TICKET";
        }
        return "";
    }
}
