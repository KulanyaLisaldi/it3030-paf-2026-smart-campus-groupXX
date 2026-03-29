package com.example.server.service;

import com.example.server.repository.TicketRepo;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Service-level timing: Time to First Response (TFR) and Time to Resolution (TTR).
 * TFR is set once on the first qualifying event (technician assignment, first ticket comment, or first chat message).
 * TTR is set when the ticket status becomes RESOLVED.
 */
@Service
public class TicketMetricsService {

    private final TicketRepo ticketRepo;

    public TicketMetricsService(TicketRepo ticketRepo) {
        this.ticketRepo = ticketRepo;
    }

    public void recordFirstResponseIfBlank(String ticketId) {
        if (ticketId == null || ticketId.isBlank()) {
            return;
        }
        ticketRepo.findById(ticketId).ifPresent(ticket -> {
            if (ticket.getFirstResponseAt() != null) {
                return;
            }
            ticket.setFirstResponseAt(Instant.now());
            ticketRepo.save(ticket);
        });
    }
}
