package com.example.server.controller;

import com.example.server.dto.ticket.AcceptTicketRequest;
import com.example.server.dto.ticket.AdminTicketWithComments;
import com.example.server.service.AdminTicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class AdminTicketController {

    private final AdminTicketService adminTicketService;

    public AdminTicketController(AdminTicketService adminTicketService) {
        this.adminTicketService = adminTicketService;
    }

    @GetMapping({"/api/adminticket/tickets", "/api/admin/tickets"})
    public List<AdminTicketWithComments> getAllTicketsWithComments() {
        return adminTicketService.getAllTicketsWithComments();
    }

    /**
     * POST is supported in addition to PATCH so proxies or older clients that block PATCH can still accept.
     */
    @RequestMapping(
        value = {"/api/adminticket/tickets/{id}/accept", "/api/admin/tickets/{id}/accept"},
        method = {RequestMethod.PATCH, RequestMethod.POST}
    )
    public ResponseEntity<?> acceptTicket(
        @PathVariable("id") String id,
        @Valid @RequestBody AcceptTicketRequest body
    ) {
        return adminTicketService
            .acceptTicket(id, body.getTechnicianId(), body.getTechnicianName())
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ticket not found")));
    }
}

