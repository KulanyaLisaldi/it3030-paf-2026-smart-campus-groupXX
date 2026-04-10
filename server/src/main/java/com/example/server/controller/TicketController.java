package com.example.server.controller;

import com.example.server.dto.ticket.CreateTicketRequest;
import com.example.server.dto.ticket.CreateTicketCommentRequest;
import com.example.server.dto.ticket.UpdateTicketCommentRequest;
import com.example.server.dto.ticket.UpdateTicketRequest;
import com.example.server.model.Ticket;
import com.example.server.service.TicketService;
import com.example.server.service.TicketDetailsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final TicketDetailsService ticketDetailsService;

    public TicketController(TicketService ticketService, TicketDetailsService ticketDetailsService) {
        this.ticketService = ticketService;
        this.ticketDetailsService = ticketDetailsService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createTicket(
        Authentication authentication,
        @Valid @ModelAttribute CreateTicketRequest request,
        @RequestParam(value = "attachments", required = false) MultipartFile[] attachments
    ) throws IOException {
        String userId = authentication.getName();
        Ticket createdTicket = ticketService.createTicket(request, attachments, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message", "Ticket created successfully",
                "ticket", createdTicket
            )
        );
    }

    @GetMapping("/my")
    public List<Ticket> getMyTickets(Authentication authentication) {
        return ticketService.getMyTickets(authentication.getName());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTicket(
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateTicketRequest request,
        Authentication authentication
    ) {
        return ticketService.updateTicket(id, request, authentication)
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Ticket updated successfully", "ticket", updated)))
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Ticket not found"))
            );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTicket(@PathVariable("id") String id, Authentication authentication) {
        boolean deleted = ticketDetailsService.deleteTicket(id, authentication);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Ticket deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTicketDetails(@PathVariable("id") String id, Authentication authentication) {
        return ticketDetailsService.getTicketDetails(id, authentication)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Ticket not found"))
            );
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addTicketComment(
        @PathVariable("id") String id,
        @Valid @RequestBody CreateTicketCommentRequest request,
        Authentication authentication
    ) {
        return ticketDetailsService.addComment(id, request, authentication)
            .<ResponseEntity<?>>map(comment -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "Comment added successfully", "comment", comment))
            )
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Ticket not found"))
            );
    }

    @PutMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> updateTicketComment(
        @PathVariable("id") String id,
        @PathVariable("commentId") String commentId,
        @Valid @RequestBody UpdateTicketCommentRequest request,
        Authentication authentication
    ) {
        return ticketDetailsService.updateComment(id, commentId, request, authentication)
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(Map.of("message", "Comment updated successfully", "comment", updated)))
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Ticket or comment not found"))
            );
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<?> deleteTicketComment(
        @PathVariable("id") String id,
        @PathVariable("commentId") String commentId,
        Authentication authentication
    ) {
        boolean deleted = ticketDetailsService.deleteComment(id, commentId, authentication);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket or comment not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Comment deleted successfully"));
    }
}
