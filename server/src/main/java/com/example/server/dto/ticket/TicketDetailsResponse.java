package com.example.server.dto.ticket;

import com.example.server.model.Ticket;
import com.example.server.model.TicketComment;

import java.util.List;

public class TicketDetailsResponse {

    private Ticket ticket;
    private List<TicketComment> comments;

    public TicketDetailsResponse() {
    }

    public TicketDetailsResponse(Ticket ticket, List<TicketComment> comments) {
        this.ticket = ticket;
        this.comments = comments;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public List<TicketComment> getComments() {
        return comments;
    }

    public void setComments(List<TicketComment> comments) {
        this.comments = comments;
    }
}

