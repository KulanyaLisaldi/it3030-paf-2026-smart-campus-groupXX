package com.example.server.service;

import com.example.server.dto.ticket.CreateTicketRequest;
import com.example.server.dto.ticket.UpdateTicketRequest;
import com.example.server.model.Ticket;
import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.TicketRepo;
import com.example.server.repository.UserRepo;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
public class TicketService {

    private static final List<String> ALLOWED_CATEGORIES = List.of(
        "Electrical Issue",
        "Network Issue",
        "Equipment Issue",
        "Software Issue",
        "Facility Issue",
        "Maintenance Issue",
        "Other"
    );
    private static final List<String> ALLOWED_PRIORITIES = List.of("High", "Medium", "Low");
    private static final int MAX_ATTACHMENTS = 3;

    private final TicketRepo ticketRepo;
    private final NotificationService notificationService;
    private final UserRepo userRepo;

    public TicketService(TicketRepo ticketRepo, NotificationService notificationService, UserRepo userRepo) {
        this.ticketRepo = ticketRepo;
        this.notificationService = notificationService;
        this.userRepo = userRepo;
    }

    public Ticket createTicket(CreateTicketRequest request, MultipartFile[] attachments, String reporterUserId) throws IOException {
        validateRequest(request);
        if (reporterUserId == null || reporterUserId.isBlank()) {
            throw new IllegalArgumentException("Reporter user id is required");
        }
        List<String> attachmentPaths = saveAttachments(attachments);

        Ticket ticket = new Ticket();
        ticket.setFullName(request.getFullName().trim());
        ticket.setEmail(request.getEmail().trim().toLowerCase());
        ticket.setPhoneNumber(request.getPhoneNumber().trim());
        ticket.setResourceLocation(request.getResourceLocation().trim());
        ticket.setCategory(request.getCategory().trim());
        ticket.setIssueTitle(request.getIssueTitle().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setPriority(request.getPriority().trim());
        ticket.setAttachments(attachmentPaths);
        ticket.setStatus("OPEN");
        ticket.setCreatedBy(reporterUserId.trim());
        ticket.setCreatedAt(Instant.now());

        Ticket saved = ticketRepo.save(ticket);
        notificationService.createForRole(
            UserRole.ADMIN,
            "TICKET_CREATED",
            "New incident ticket",
            "A new support ticket was created: " + saved.getIssueTitle().trim(),
            "TICKET",
            saved.getId(),
            "/adminticket"
        );
        return saved;
    }

    public List<Ticket> getMyTickets(String createdBy) {
        return ticketRepo.findByCreatedByOrderByCreatedAtDesc(createdBy);
    }

    public Optional<Ticket> updateTicket(String ticketId, UpdateTicketRequest request, Authentication authentication) {
        validateFields(request.getCategory(), request.getPriority());
        Optional<Ticket> maybeTicket = ticketRepo.findById(ticketId);
        if (maybeTicket.isEmpty()) {
            return Optional.empty();
        }

        Ticket ticket = maybeTicket.get();
        ensureCanEditTicket(ticket, authentication);
        ticket.setFullName(request.getFullName().trim());
        ticket.setEmail(request.getEmail().trim().toLowerCase());
        ticket.setPhoneNumber(request.getPhoneNumber().trim());
        ticket.setResourceLocation(request.getResourceLocation().trim());
        ticket.setCategory(request.getCategory().trim());
        ticket.setIssueTitle(request.getIssueTitle().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setPriority(request.getPriority().trim());

        return Optional.of(ticketRepo.save(ticket));
    }

    private void ensureCanEditTicket(Ticket ticket, Authentication authentication) {
        if (hasRole(authentication, "ROLE_ADMIN")) {
            return;
        }
        String actorUserId = safeTrim(authentication == null ? "" : authentication.getName());
        if (actorUserId.isEmpty()) {
            throw new ResponseStatusException(FORBIDDEN, "Forbidden");
        }
        String createdBy = safeTrim(ticket.getCreatedBy());
        if (createdBy.equals(actorUserId)) {
            return;
        }
        Optional<User> actor = userRepo.findById(actorUserId);
        if (actor.isPresent()) {
            String email = safeTrim(actor.get().getEmail()).toLowerCase(Locale.ROOT);
            if (!email.isEmpty() && createdBy.equalsIgnoreCase(email)) {
                return;
            }
        }
        throw new ResponseStatusException(FORBIDDEN, "Forbidden");
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

    private void validateRequest(CreateTicketRequest request) {
        validateFields(request.getCategory(), request.getPriority());
    }

    private void validateFields(String category, String priority) {
        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Invalid category selected");
        }
        if (!ALLOWED_PRIORITIES.contains(priority)) {
            throw new IllegalArgumentException("Invalid priority selected");
        }
    }

    private List<String> saveAttachments(MultipartFile[] attachments) throws IOException {
        if (attachments == null || attachments.length == 0) {
            return List.of();
        }

        if (attachments.length > MAX_ATTACHMENTS) {
            throw new IllegalArgumentException("You can upload up to 3 images only");
        }

        Path uploadDir = Paths.get("uploads", "tickets").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);

        List<String> savedPaths = new ArrayList<>();

        for (MultipartFile file : attachments) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Only image files are allowed for attachments");
            }

            String originalName = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename();
            String safeFileName = UUID.randomUUID() + "-" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path destination = uploadDir.resolve(safeFileName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            savedPaths.add("/uploads/tickets/" + safeFileName);
        }

        if (savedPaths.size() > MAX_ATTACHMENTS) {
            throw new IllegalArgumentException("You can upload up to 3 images only");
        }

        return savedPaths;
    }
}
