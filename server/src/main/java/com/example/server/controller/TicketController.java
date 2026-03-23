package com.example.server.controller;

import com.example.server.dto.ticket.CreateTicketRequest;
import com.example.server.dto.ticket.CreateTicketCommentRequest;
import com.example.server.model.Ticket;
import com.example.server.service.TicketService;
import com.example.server.service.TicketDetailsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
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
        @Valid @ModelAttribute CreateTicketRequest request,
        @RequestParam(value = "attachments", required = false) MultipartFile[] attachments
    ) throws IOException {
        Ticket createdTicket = ticketService.createTicket(request, attachments);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message", "Ticket created successfully",
                "ticket", createdTicket
            )
        );
    }

    @GetMapping("/my")
    public List<Ticket> getMyTickets(@RequestParam("createdBy") String createdBy) {
        return ticketService.getMyTickets(createdBy);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTicketDetails(@PathVariable("id") String id) {
        return ticketDetailsService.getTicketDetails(id)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Ticket not found"))
            );
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addTicketComment(
        @PathVariable("id") String id,
        @Valid @RequestBody CreateTicketCommentRequest request
    ) {
        return ticketDetailsService.addComment(id, request)
            .<ResponseEntity<?>>map(comment -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "Comment added successfully", "comment", comment))
            )
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Ticket not found"))
            );
    }
}
