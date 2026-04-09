package com.example.server.service;

import com.example.server.dto.ticket.AssignedTechnicianDetails;
import com.example.server.dto.ticket.CreateTicketCommentRequest;
import com.example.server.dto.ticket.TicketDetailsResponse;
import com.example.server.dto.ticket.UpdateTicketCommentRequest;
import com.example.server.model.Ticket;
import com.example.server.model.TicketComment;
import com.example.server.model.TechnicianCategory;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.TicketChatRepo;
import com.example.server.repository.TicketCommentRepo;
import com.example.server.repository.TicketRepo;
import com.example.server.repository.UserRepo;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class TicketDetailsService {

    private final TicketRepo ticketRepo;
    private final TicketCommentRepo commentRepo;
    private final TicketChatRepo ticketChatRepo;
    private final UserRepo userRepo;
    private final TicketMetricsService ticketMetricsService;
    private final NotificationService notificationService;

    public TicketDetailsService(
        TicketRepo ticketRepo,
        TicketCommentRepo commentRepo,
        TicketChatRepo ticketChatRepo,
        UserRepo userRepo,
        TicketMetricsService ticketMetricsService,
        NotificationService notificationService
    ) {
        this.ticketRepo = ticketRepo;
        this.commentRepo = commentRepo;
        this.ticketChatRepo = ticketChatRepo;
        this.userRepo = userRepo;
        this.ticketMetricsService = ticketMetricsService;
        this.notificationService = notificationService;
    }

    public Optional<TicketDetailsResponse> getTicketDetails(String ticketId) {
        Optional<Ticket> ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) {
            return Optional.empty();
        }

        Ticket entity = ticket.get();
        List<TicketComment> comments = commentRepo.findByTicketIdOrderByCreatedAtDesc(ticketId);
        AssignedTechnicianDetails assignee = resolveAssignedTechnician(entity);
        return Optional.of(new TicketDetailsResponse(entity, comments, assignee));
    }

    private AssignedTechnicianDetails resolveAssignedTechnician(Ticket ticket) {
        String ref = ticket.getAssignedTechnicianId();
        String storedName = ticket.getAssignedTechnicianName();
        boolean refBlank = ref == null || ref.isBlank();
        boolean nameBlank = storedName == null || storedName.isBlank();
        if (refBlank && nameBlank) {
            return null;
        }

        if (!refBlank) {
            String r = ref.trim();
            Optional<User> user = userRepo.findById(r);
            if (user.isEmpty()) {
                user = userRepo.findByEmail(r.toLowerCase(Locale.ROOT));
            }
            if (user.isPresent()) {
                return mapAssignee(user.get());
            }
        }

        if (!nameBlank) {
            AssignedTechnicianDetails fallback = new AssignedTechnicianDetails();
            fallback.setDisplayName(storedName.trim());
            if (!refBlank && ref.trim().contains("@")) {
                fallback.setEmail(ref.trim());
            }
            return fallback;
        }

        return null;
    }

    private static AssignedTechnicianDetails mapAssignee(User u) {
        AssignedTechnicianDetails d = new AssignedTechnicianDetails();
        d.setUserId(u.getId());
        String fn = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String ln = u.getLastName() == null ? "" : u.getLastName().trim();
        String full = (fn + " " + ln).trim();
        if (full.isEmpty()) {
            full = u.getEmail() != null && !u.getEmail().isBlank() ? u.getEmail().trim() : "Technician";
        }
        d.setDisplayName(full);
        d.setEmail(u.getEmail());
        d.setPhoneNumber(u.getPhoneNumber());
        if (u.getTechnicianCategory() != null) {
            d.setTechnicianCategory(u.getTechnicianCategory().name());
        }
        List<TechnicianCategory> multi = u.getTechnicianCategories();
        if (multi != null && !multi.isEmpty()) {
            Set<String> seen = new LinkedHashSet<>();
            List<String> names = new ArrayList<>();
            for (TechnicianCategory c : multi) {
                if (c == null) {
                    continue;
                }
                String n = c.name();
                if (seen.add(n)) {
                    names.add(n);
                }
            }
            d.setTechnicianCategories(names);
        }
        return d;
    }

    public Optional<TicketComment> addComment(String ticketId, CreateTicketCommentRequest request, Authentication authentication) {
        Optional<Ticket> ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) {
            return Optional.empty();
        }

        validateCommentContent(request.getContent());

        TicketComment comment = new TicketComment();
        comment.setTicketId(ticketId);
        comment.setContent(request.getContent().trim());
        comment.setCreatedBy(request.getCreatedBy().trim());
        comment.setCreatedAt(Instant.now());

        TicketComment saved = commentRepo.save(comment);
        ticketMetricsService.recordFirstResponseIfBlank(ticketId);
        notifyCommentParties(ticket.get(), saved, authentication);
        return Optional.of(saved);
    }

    public Optional<TicketComment> updateComment(String ticketId, String commentId, UpdateTicketCommentRequest request) {
        Optional<Ticket> ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) {
            return Optional.empty();
        }

        Optional<TicketComment> maybeComment = commentRepo.findById(commentId);
        if (maybeComment.isEmpty()) {
            return Optional.empty();
        }

        TicketComment comment = maybeComment.get();
        if (!ticketId.equals(comment.getTicketId())) {
            return Optional.empty();
        }

        validateCommentContent(request.getContent());
        comment.setContent(request.getContent().trim());
        return Optional.of(commentRepo.save(comment));
    }

    public boolean deleteComment(String ticketId, String commentId) {
        Optional<Ticket> ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) {
            return false;
        }

        Optional<TicketComment> maybeComment = commentRepo.findById(commentId);
        if (maybeComment.isEmpty()) {
            return false;
        }

        TicketComment comment = maybeComment.get();
        if (!ticketId.equals(comment.getTicketId())) {
            return false;
        }

        commentRepo.deleteById(commentId);
        return true;
    }

    public boolean deleteTicket(String ticketId) {
        Optional<Ticket> maybeTicket = ticketRepo.findById(ticketId);
        if (maybeTicket.isEmpty()) {
            return false;
        }

        commentRepo.deleteByTicketId(ticketId);
        ticketChatRepo.deleteByTicketId(ticketId);
        ticketRepo.deleteById(ticketId);
        return true;
    }

    private void validateCommentContent(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Comment content is required");
        }
        if (!trimmed.matches("^[a-zA-Z0-9\\s]+$")) {
            throw new IllegalArgumentException("Comment cannot contain special characters");
        }
        if (trimmed.matches(".*(.)\\1{3,}.*")) {
            throw new IllegalArgumentException("Comment cannot repeat the same character many times");
        }
    }

    private void notifyCommentParties(Ticket ticket, TicketComment comment, Authentication authentication) {
        String actorUserId = safeTrim(authentication == null ? "" : authentication.getName());
        boolean actorIsAdmin = hasRole(authentication, "ROLE_ADMIN");
        boolean actorIsTechnician = hasRole(authentication, "ROLE_TECHNICIAN");
        boolean actorIsUser = !actorIsAdmin && !actorIsTechnician;

        if (actorIsUser) {
            findAssigneeUser(ticket).ifPresent(technician -> {
                if (technician.getId() != null && !technician.getId().equals(actorUserId)) {
                    notificationService.createAndPush(
                        technician.getId(),
                        "TICKET_COMMENT_ADDED",
                        "New ticket comment",
                        "User posted a new comment on assigned ticket.",
                        "TICKET",
                        ticket.getId(),
                        "/technician/tickets"
                    );
                }
            });
            userRepo.findByRole(UserRole.ADMIN).forEach(admin -> {
                if (admin == null || admin.getId() == null) return;
                if (admin.getId().equals(actorUserId)) return;
                notificationService.createAndPush(
                    admin.getId(),
                    "TICKET_COMMENT_ADDED",
                    "New user comment",
                    "A user commented on ticket: " + safeTitle(ticket),
                    "TICKET",
                    ticket.getId(),
                    "/adminticket"
                );
            });
            return;
        }

        resolveTicketOwnerId(ticket).ifPresent(ownerId -> {
            if (!ownerId.equals(actorUserId)) {
                notificationService.createAndPush(
                    ownerId,
                    "TICKET_COMMENT_ADDED",
                    "New ticket comment",
                    "A staff member commented on your ticket.",
                    "TICKET",
                    ticket.getId(),
                    "/my-tickets"
                );
            }
        });
    }

    private Optional<User> findAssigneeUser(Ticket ticket) {
        String raw = ticket == null ? "" : safeTrim(ticket.getAssignedTechnicianId());
        if (raw.isEmpty()) return Optional.empty();
        Optional<User> byId = userRepo.findById(raw);
        if (byId.isPresent()) return byId;
        return userRepo.findByEmail(raw.toLowerCase(Locale.ROOT));
    }

    private Optional<String> resolveTicketOwnerId(Ticket ticket) {
        String ref = ticket == null ? "" : safeTrim(ticket.getCreatedBy());
        if (ref.isEmpty()) return Optional.empty();
        Optional<User> byId = userRepo.findById(ref);
        if (byId.isPresent()) return Optional.ofNullable(byId.get().getId());
        return userRepo.findByEmail(ref.toLowerCase(Locale.ROOT)).map(User::getId);
    }

    private static boolean hasRole(Authentication authentication, String roleAuthority) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(roleAuthority::equals);
    }

    private static String safeTrim(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private static String safeTitle(Ticket ticket) {
        String title = ticket == null ? "" : safeTrim(ticket.getIssueTitle());
        return title.isEmpty() ? "Incident ticket" : title;
    }
}

