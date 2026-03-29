package com.example.server.controller;

import com.example.server.dto.ticket.UpdateTicketProgressRequest;
import com.example.server.model.Ticket;
import com.example.server.service.TechnicianTicketService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Uses full path mappings on each method so every Spring Boot version registers routes reliably.
 */
@RestController
public class TechnicianTicketController {

    private final TechnicianTicketService technicianTicketService;

    public TechnicianTicketController(TechnicianTicketService technicianTicketService) {
        this.technicianTicketService = technicianTicketService;
    }

    @GetMapping("/api/technician/assigned-tickets")
    public List<Ticket> listAssigned(Authentication authentication) {
        return technicianTicketService.listAssigned(authentication.getName());
    }

    /** Fallback path (still requires TECHNICIAN); registered before /api/tickets/** permitAll in security. */
    @GetMapping("/api/tickets/technician/assigned")
    public List<Ticket> listAssignedForTicketNamespace(Authentication authentication) {
        return technicianTicketService.listAssigned(authentication.getName());
    }

    @PatchMapping("/api/technician/tickets/{id}/progress")
    public Map<String, Object> updateProgressPatch(
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateTicketProgressRequest body,
        Authentication authentication
    ) {
        return doUpdateProgress(id, body, authentication);
    }

    @PostMapping("/api/technician/tickets/{id}/progress")
    public Map<String, Object> updateProgressPost(
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateTicketProgressRequest body,
        Authentication authentication
    ) {
        return doUpdateProgress(id, body, authentication);
    }

    private Map<String, Object> doUpdateProgress(
        String id,
        UpdateTicketProgressRequest body,
        Authentication authentication
    ) {
        Ticket updated = technicianTicketService.updateProgress(
            id,
            body.getStatus(),
            authentication.getName(),
            body.getResolutionDetails()
        );
        return Map.of("message", "Progress updated", "ticket", updated);
    }
}
