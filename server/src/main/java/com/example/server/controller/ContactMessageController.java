package com.example.server.controller;

import com.example.server.dto.contact.CreateContactMessageRequest;
import com.example.server.model.ContactMessage;
import com.example.server.repository.ContactMessageRepo;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/contact-messages")
public class ContactMessageController {

    private final ContactMessageRepo contactMessageRepo;

    public ContactMessageController(ContactMessageRepo contactMessageRepo) {
        this.contactMessageRepo = contactMessageRepo;
    }

    @PostMapping
    public ResponseEntity<?> createContactMessage(@Valid @RequestBody CreateContactMessageRequest body) {
        ContactMessage item = new ContactMessage();
        item.setFirstName(trim(body.getFirstName()));
        item.setLastName(trim(body.getLastName()));
        item.setEmail(trim(body.getEmail()));
        item.setPhone(trim(body.getPhone()));
        item.setSubject(trim(body.getSubject()));
        item.setMessage(trim(body.getMessage()));
        item.setStatus("Submitted");
        item.setSubmittedAt(Instant.now());
        item.setLastEditedAt(null);
        item.setAdminReply(null);
        item.setAdminRepliedAt(null);

        ContactMessage saved = contactMessageRepo.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", saved));
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }
}
