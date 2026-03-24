package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;

public class CreateTicketCommentRequest {

    @NotBlank(message = "Comment content is required")
    private String content;

    @NotBlank(message = "Created by is required")
    private String createdBy;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}

