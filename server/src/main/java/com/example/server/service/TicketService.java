package com.example.server.service;

import com.example.server.dto.ticket.CreateTicketRequest;
import com.example.server.dto.ticket.UpdateTicketRequest;
import com.example.server.model.Ticket;
import com.example.server.repository.TicketRepo;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

    public TicketService(TicketRepo ticketRepo) {
        this.ticketRepo = ticketRepo;
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

        return ticketRepo.save(ticket);
    }

    public List<Ticket> getMyTickets(String createdBy) {
        return ticketRepo.findByCreatedByOrderByCreatedAtDesc(createdBy);
    }

    public Optional<Ticket> updateTicket(String ticketId, UpdateTicketRequest request) {
        validateFields(request.getCategory(), request.getPriority());
        Optional<Ticket> maybeTicket = ticketRepo.findById(ticketId);
        if (maybeTicket.isEmpty()) {
            return Optional.empty();
        }

        Ticket ticket = maybeTicket.get();
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
