package com.example.server.service;

import com.example.server.dto.ticket.AdminTicketWithComments;
import com.example.server.model.Ticket;
import com.example.server.model.TicketComment;
import com.example.server.repository.TicketCommentRepo;
import com.example.server.repository.TicketRepo;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AdminTicketService {

    private final TicketRepo ticketRepo;
    private final TicketCommentRepo commentRepo;

    public AdminTicketService(TicketRepo ticketRepo, TicketCommentRepo commentRepo) {
        this.ticketRepo = ticketRepo;
        this.commentRepo = commentRepo;
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
            Ticket saved = ticketRepo.save(ticket);
            List<TicketComment> comments = commentRepo.findByTicketIdOrderByCreatedAtDesc(ticketId);
            return new AdminTicketWithComments(saved, comments);
        });
    }
}

