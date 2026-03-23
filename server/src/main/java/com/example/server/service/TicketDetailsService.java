package com.example.server.service;

import com.example.server.dto.ticket.CreateTicketCommentRequest;
import com.example.server.dto.ticket.TicketDetailsResponse;
import com.example.server.model.Ticket;
import com.example.server.model.TicketComment;
import com.example.server.repository.TicketCommentRepo;
import com.example.server.repository.TicketRepo;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class TicketDetailsService {

    private final TicketRepo ticketRepo;
    private final TicketCommentRepo commentRepo;

    public TicketDetailsService(TicketRepo ticketRepo, TicketCommentRepo commentRepo) {
        this.ticketRepo = ticketRepo;
        this.commentRepo = commentRepo;
    }

    public Optional<TicketDetailsResponse> getTicketDetails(String ticketId) {
        Optional<Ticket> ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) {
            return Optional.empty();
        }

        List<TicketComment> comments = commentRepo.findByTicketIdOrderByCreatedAtDesc(ticketId);
        return Optional.of(new TicketDetailsResponse(ticket.get(), comments));
    }

    public Optional<TicketComment> addComment(String ticketId, CreateTicketCommentRequest request) {
        Optional<Ticket> ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) {
            return Optional.empty();
        }

        TicketComment comment = new TicketComment();
        comment.setTicketId(ticketId);
        comment.setContent(request.getContent().trim());
        comment.setCreatedBy(request.getCreatedBy().trim());
        comment.setCreatedAt(Instant.now());

        return Optional.of(commentRepo.save(comment));
    }
}

