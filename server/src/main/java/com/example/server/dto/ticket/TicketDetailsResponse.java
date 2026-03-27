package com.example.server.dto.ticket;

import com.example.server.model.Ticket;
import com.example.server.model.TicketComment;

import java.util.List;

public class TicketDetailsResponse {

    private Ticket ticket;
    private List<TicketComment> comments;
    private AssignedTechnicianDetails assignedTechnician;

    public TicketDetailsResponse() {
    }

    public TicketDetailsResponse(Ticket ticket, List<TicketComment> comments, AssignedTechnicianDetails assignedTechnician) {
        this.ticket = ticket;
        this.comments = comments;
        this.assignedTechnician = assignedTechnician;
    }

    public TicketDetailsResponse(Ticket ticket, List<TicketComment> comments) {
        this(ticket, comments, null);
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

    public AssignedTechnicianDetails getAssignedTechnician() {
        return assignedTechnician;
    }

    public void setAssignedTechnician(AssignedTechnicianDetails assignedTechnician) {
        this.assignedTechnician = assignedTechnician;
    }
}

