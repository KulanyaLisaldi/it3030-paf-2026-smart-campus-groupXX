package com.example.server.service;

import com.example.server.dto.ticket.CreateTicketChatMessageRequest;
import com.example.server.model.Ticket;
import com.example.server.model.TicketChatMessage;
import com.example.server.model.User;
import com.example.server.repository.TicketChatRepo;
import com.example.server.repository.TicketRepo;
import com.example.server.repository.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class TicketChatService {

    public static final String SENDER_USER = "USER";
    public static final String SENDER_TECHNICIAN = "TECHNICIAN";

    private final TicketRepo ticketRepo;
    private final TicketChatRepo chatRepo;
    private final UserRepo userRepo;

    public TicketChatService(TicketRepo ticketRepo, TicketChatRepo chatRepo, UserRepo userRepo) {
        this.ticketRepo = ticketRepo;
        this.chatRepo = chatRepo;
        this.userRepo = userRepo;
    }

    public List<TicketChatMessage> listMessages(String ticketId, Authentication authentication) {
        Ticket ticket = ticketRepo
            .findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        assertChatParticipant(ticket, authentication);
        return chatRepo.findByTicketIdOrderByCreatedAtAsc(ticketId);
    }

    public TicketChatMessage postMessage(String ticketId, CreateTicketChatMessageRequest request, Authentication authentication) {
        Ticket ticket = ticketRepo
            .findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        assertTicketHasAssignment(ticket);
        String role = resolveParticipantRole(ticket, authentication);
        String uid = authentication.getName();
        if (uid == null || uid.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        String body = validateBody(request.getBody());
        User senderUser = userRepo.findById(uid.trim()).orElse(null);

        TicketChatMessage msg = new TicketChatMessage();
        msg.setTicketId(ticketId);
        msg.setSenderUserId(uid.trim());
        msg.setSenderRole(role);
        msg.setSenderDisplayName(resolveDisplayName(role, ticket, senderUser));
        msg.setBody(body);
        msg.setCreatedAt(Instant.now());
        return chatRepo.save(msg);
    }

    private void assertTicketHasAssignment(Ticket ticket) {
        String ref = ticket.getAssignedTechnicianId();
        if (ref == null || ref.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chat is available after a technician is assigned to this ticket");
        }
    }

    private void assertChatParticipant(Ticket ticket, Authentication authentication) {
        assertTicketHasAssignment(ticket);
        resolveParticipantRole(ticket, authentication);
    }

    private String resolveParticipantRole(Ticket ticket, Authentication authentication) {
        String uid = authentication.getName();
        if (uid == null || uid.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        String trimmed = uid.trim();
        boolean isTechnician = hasRole(authentication, "ROLE_TECHNICIAN");
        if (isTechnician && isAssignedToTechnician(ticket, trimmed)) {
            return SENDER_TECHNICIAN;
        }
        if (isTicketOwner(ticket, trimmed)) {
            return SENDER_USER;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this chat");
    }

    private static boolean hasRole(Authentication authentication, String roleAuthority) {
        return authentication
            .getAuthorities()
            .stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(roleAuthority::equals);
    }

    private boolean isTicketOwner(Ticket ticket, String userId) {
        String createdBy = ticket.getCreatedBy();
        return createdBy != null && !createdBy.isBlank() && createdBy.trim().equals(userId);
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

    private String resolveDisplayName(String role, Ticket ticket, User senderUser) {
        if (SENDER_TECHNICIAN.equals(role)) {
            return technicianDisplayName(senderUser);
        }
        return ownerDisplayName(senderUser, ticket);
    }

    private static String technicianDisplayName(User u) {
        if (u == null) {
            return "Technician";
        }
        String fn = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String ln = u.getLastName() == null ? "" : u.getLastName().trim();
        String full = (fn + " " + ln).trim();
        if (!full.isEmpty()) {
            return full;
        }
        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            return u.getEmail().trim();
        }
        return "Technician";
    }

    private static String ownerDisplayName(User u, Ticket ticket) {
        if (u != null) {
            String fn = u.getFirstName() == null ? "" : u.getFirstName().trim();
            String ln = u.getLastName() == null ? "" : u.getLastName().trim();
            String full = (fn + " " + ln).trim();
            if (!full.isEmpty()) {
                return full;
            }
            if (u.getEmail() != null && !u.getEmail().isBlank()) {
                return u.getEmail().trim();
            }
        }
        String name = ticket.getFullName();
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        return "Ticket owner";
    }

    private static String validateBody(String raw) {
        String body = raw == null ? "" : raw.trim();
        if (body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
        if (body.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is too long");
        }
        return body;
    }
}
