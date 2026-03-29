package com.example.server.repository;

import com.example.server.model.Ticket;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TicketRepo extends MongoRepository<Ticket, String> {
    List<Ticket> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    List<Ticket> findByAssignedTechnicianIdOrderByCreatedAtDesc(String assignedTechnicianId);
}
