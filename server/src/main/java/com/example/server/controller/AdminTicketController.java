package com.example.server.controller;

import com.example.server.dto.ticket.AdminTicketWithComments;
import com.example.server.service.AdminTicketService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/adminticket", "/api/admin"})
public class AdminTicketController {

    private final AdminTicketService adminTicketService;

    public AdminTicketController(AdminTicketService adminTicketService) {
        this.adminTicketService = adminTicketService;
    }

    @GetMapping("/tickets")
    public List<AdminTicketWithComments> getAllTicketsWithComments() {
        return adminTicketService.getAllTicketsWithComments();
    }
}

