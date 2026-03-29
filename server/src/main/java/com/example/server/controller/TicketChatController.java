package com.example.server.controller;

import com.example.server.dto.ticket.CreateTicketChatMessageRequest;
import com.example.server.model.TicketChatMessage;
import com.example.server.service.TicketChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/api/tickets")
public class TicketChatController {

    private final TicketChatService ticketChatService;

    public TicketChatController(TicketChatService ticketChatService) {
        this.ticketChatService = ticketChatService;
    }

    @GetMapping("/{ticketId}/chat")
    public ResponseEntity<?> listMessages(@PathVariable("ticketId") String ticketId, Authentication authentication) {
        List<TicketChatMessage> messages = ticketChatService.listMessages(ticketId, authentication);
        return ResponseEntity.ok(Map.of("messages", messages));
    }

    @PostMapping("/{ticketId}/chat")
    public ResponseEntity<?> postMessage(
        @PathVariable("ticketId") String ticketId,
        @Valid @RequestBody CreateTicketChatMessageRequest request,
        Authentication authentication
    ) {
        TicketChatMessage saved = ticketChatService.postMessage(ticketId, request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", saved));
    }
}
