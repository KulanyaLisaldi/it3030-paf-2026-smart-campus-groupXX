package com.example.server.dto.auth;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public class UpdateNotificationPreferencesRequest {

    /** Uppercase category ids to mute: BOOKING, TICKET. Empty = all enabled. */
    @NotNull
    private List<String> disabledCategories;

    public List<String> getDisabledCategories() {
        return disabledCategories;
    }

    public void setDisabledCategories(List<String> disabledCategories) {
        this.disabledCategories = disabledCategories;
    }
}
