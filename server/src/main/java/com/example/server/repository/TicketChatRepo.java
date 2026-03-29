package com.example.server.repository;

import com.example.server.model.TicketChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TicketChatRepo extends MongoRepository<TicketChatMessage, String> {
    List<TicketChatMessage> findByTicketIdOrderByCreatedAtAsc(String ticketId);

    void deleteByTicketId(String ticketId);
}
