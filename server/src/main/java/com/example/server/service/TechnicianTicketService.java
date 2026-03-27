package com.example.server.service;

import com.example.server.model.Ticket;
import com.example.server.model.User;
import com.example.server.repository.TicketRepo;
import com.example.server.repository.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class TechnicianTicketService {

    private final TicketRepo ticketRepo;
    private final UserRepo userRepo;

    public TechnicianTicketService(TicketRepo ticketRepo, UserRepo userRepo) {
        this.ticketRepo = ticketRepo;
        this.userRepo = userRepo;
    }

    public List<Ticket> listAssigned(String technicianUserId) {
        if (technicianUserId == null || technicianUserId.isBlank()) {
            return List.of();
        }
        String uid = technicianUserId.trim();
        Map<String, Ticket> byId = new LinkedHashMap<>();
        ticketRepo.findByAssignedTechnicianIdOrderByCreatedAtDesc(uid).forEach(t -> byId.putIfAbsent(t.getId(), t));
        Optional<User> user = userRepo.findById(uid);
        user
            .map(User::getEmail)
            .map(String::trim)
            .filter(e -> !e.isEmpty())
            .ifPresent(email -> ticketRepo
                .findByAssignedTechnicianIdOrderByCreatedAtDesc(email.toLowerCase(Locale.ROOT))
                .forEach(t -> byId.putIfAbsent(t.getId(), t)));
        return byId
            .values()
            .stream()
            .sorted(Comparator.comparing(Ticket::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .toList();
    }

    public Ticket updateProgress(String ticketId, String newStatusRaw, String technicianUserId) {
        if (technicianUserId == null || technicianUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authenticated");
        }
        Ticket ticket = ticketRepo
            .findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        if (!isAssignedToTechnician(ticket, technicianUserId.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this ticket");
        }
        String next = newStatusRaw == null ? "" : newStatusRaw.trim().toUpperCase(Locale.ROOT);
        String current = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase(Locale.ROOT);
        if (!isValidTechnicianTransition(current, next)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Cannot change status from " + current + " to " + next
            );
        }
        ticket.setStatus(next);
        return ticketRepo.save(ticket);
    }

    private boolean isAssignedToTechnician(Ticket ticket, String userId) {
        String raw = ticket.getAssignedTechnicianId();
        if (raw == null || raw.isBlank()) {
            return false;
        }
        final String assignee = raw.trim();
        if (assignee.equals(userId)) {
            return true;
        }
        Optional<User> user = userRepo.findById(userId);
        return user
            .map(User::getEmail)
            .map(String::trim)
            .filter(e -> !e.isEmpty())
            .map(e -> e.equalsIgnoreCase(assignee))
            .orElse(false);
    }

    private static boolean isValidTechnicianTransition(String current, String next) {
        if ("IN_PROGRESS".equals(next)) {
            return "ACCEPTED".equals(current);
        }
        if ("RESOLVED".equals(next)) {
            return "ACCEPTED".equals(current) || "IN_PROGRESS".equals(current);
        }
        return false;
    }
}
