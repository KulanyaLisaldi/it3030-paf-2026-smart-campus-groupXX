package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateTicketChatMessageRequest {

    @NotBlank(message = "Message is required")
    @Size(max = 2000, message = "Message is too long")
    private String body;

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }
}
