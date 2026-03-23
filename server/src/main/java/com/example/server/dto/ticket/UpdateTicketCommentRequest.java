package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;

public class UpdateTicketCommentRequest {

    @NotBlank(message = "Comment content is required")
    private String content;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
