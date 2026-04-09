package com.example.server.repository;

import com.example.server.model.ContactMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ContactMessageRepo extends MongoRepository<ContactMessage, String> {
    List<ContactMessage> findAllByOrderBySubmittedAtDesc();
}
