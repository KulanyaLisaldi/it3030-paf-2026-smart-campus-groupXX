package com.example.server.dto.auth;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public class UpdateNotificationPreferencesRequest {

    /**
     * Categories to mute for in-app notifications (uppercase BOOKING, TICKET). Empty list = all enabled.
     */
    @NotNull
    private List<String> disabledCategories;

    public List<String> getDisabledCategories() {
        return disabledCategories;
    }

    public void setDisabledCategories(List<String> disabledCategories) {
        this.disabledCategories = disabledCategories;
    }
}
