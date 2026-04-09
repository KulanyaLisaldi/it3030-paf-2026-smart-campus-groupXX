package com.example.server.service;

import com.example.server.dto.ticket.AdminTicketWithComments;
import com.example.server.model.Ticket;
import com.example.server.model.TicketComment;
import com.example.server.model.User;
import com.example.server.repository.TicketCommentRepo;
import com.example.server.repository.TicketRepo;
import com.example.server.repository.UserRepo;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AdminTicketService {

    private final TicketRepo ticketRepo;
    private final TicketCommentRepo commentRepo;
    private final UserRepo userRepo;
    private final TicketNotificationEmailService ticketNotificationEmailService;
    private final NotificationService notificationService;

    public AdminTicketService(
        TicketRepo ticketRepo,
        TicketCommentRepo commentRepo,
        UserRepo userRepo,
        TicketNotificationEmailService ticketNotificationEmailService,
        NotificationService notificationService
    ) {
        this.ticketRepo = ticketRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
        this.ticketNotificationEmailService = ticketNotificationEmailService;
        this.notificationService = notificationService;
    }

    public List<AdminTicketWithComments> getAllTicketsWithComments() {
        List<Ticket> tickets = ticketRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<AdminTicketWithComments> result = new ArrayList<>();

        for (Ticket ticket : tickets) {
            List<TicketComment> comments = commentRepo.findByTicketIdOrderByCreatedAtDesc(ticket.getId());
            result.add(new AdminTicketWithComments(ticket, comments));
        }

        return result;
    }

    public Optional<AdminTicketWithComments> acceptTicket(String ticketId, String technicianId, String technicianName) {
        return ticketRepo.findById(ticketId).map(ticket -> {
            ticket.setStatus("ACCEPTED");
            ticket.setAssignedTechnicianId(technicianId);
            ticket.setAssignedTechnicianName(technicianName);
            Instant assignInstant = Instant.now();
            if (ticket.getTechnicianAssignedAt() == null) {
                ticket.setTechnicianAssignedAt(assignInstant);
            }
            if (ticket.getFirstResponseAt() == null) {
                ticket.setFirstResponseAt(assignInstant);
            }
            Ticket saved = ticketRepo.save(ticket);
            List<TicketComment> comments = commentRepo.findByTicketIdOrderByCreatedAtDesc(ticketId);
            User technician = resolveUserByTechnicianRef(technicianId).orElse(null);
            ticketNotificationEmailService.notifyAssignment(saved, technician);
            if (technician != null && technician.getId() != null) {
                notificationService.createAndPush(
                    technician.getId(),
                    "TICKET_ASSIGNED",
                    "Ticket assigned to you",
                    "You were assigned ticket: " + safeTitle(saved),
                    "TICKET",
                    saved.getId(),
                    "/technician/tickets"
                );
            }
            resolveTicketOwnerId(saved).ifPresent(ownerId ->
                notificationService.createAndPush(
                    ownerId,
                    "TICKET_STATUS_CHANGED",
                    "Ticket accepted",
                    "Your ticket was accepted and assigned to a technician.",
                    "TICKET",
                    saved.getId(),
                    "/my-tickets"
                )
            );
            return new AdminTicketWithComments(saved, comments);
        });
    }

    public Optional<AdminTicketWithComments> rejectTicket(String ticketId, String reasonRaw) {
        String reason = reasonRaw == null ? "" : reasonRaw.trim();
        if (reason.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rejection reason is required");
        }
        if (reason.matches(".*(.)\\1{3,}.*")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Rejection reason cannot repeat the same character many times"
            );
        }
        return ticketRepo.findById(ticketId).map(ticket -> {
            String status = ticket.getStatus() == null ? "" : ticket.getStatus().trim().toUpperCase(Locale.ROOT);
            if (!"OPEN".equals(status)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only open tickets can be rejected");
            }
            ticket.setStatus("REJECTED");
            ticket.setRejectionReason(reason);
            Ticket saved = ticketRepo.save(ticket);
            List<TicketComment> comments = commentRepo.findByTicketIdOrderByCreatedAtDesc(ticketId);
            ticketNotificationEmailService.notifyTicketRejected(saved, reason);
            resolveTicketOwnerId(saved).ifPresent(ownerId ->
                notificationService.createAndPush(
                    ownerId,
                    "TICKET_STATUS_CHANGED",
                    "Ticket rejected",
                    "Your ticket was rejected by admin.",
                    "TICKET",
                    saved.getId(),
                    "/my-tickets"
                )
            );
            return new AdminTicketWithComments(saved, comments);
        });
    }

    private Optional<String> resolveTicketOwnerId(Ticket ticket) {
        String ref = ticket == null ? "" : safeTrim(ticket.getCreatedBy());
        if (ref.isEmpty()) return Optional.empty();
        Optional<User> byId = userRepo.findById(ref);
        if (byId.isPresent()) return Optional.ofNullable(byId.get().getId());
        return userRepo.findByEmail(ref.toLowerCase(Locale.ROOT)).map(User::getId);
    }

    private static String safeTrim(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private static String safeTitle(Ticket ticket) {
        String title = ticket == null ? "" : safeTrim(ticket.getIssueTitle());
        return title.isEmpty() ? "Incident ticket" : title;
    }

    private Optional<User> resolveUserByTechnicianRef(String technicianId) {
        if (technicianId == null || technicianId.isBlank()) {
            return Optional.empty();
        }
        String tid = technicianId.trim();
        Optional<User> byId = userRepo.findById(tid);
        if (byId.isPresent()) {
            return byId;
        }
        return userRepo.findByEmail(tid.toLowerCase(Locale.ROOT));
    }
}

