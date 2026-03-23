package com.example.server.repository;

import com.example.server.model.TicketComment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TicketCommentRepo extends MongoRepository<TicketComment, String> {
    List<TicketComment> findByTicketIdOrderByCreatedAtDesc(String ticketId);
}

