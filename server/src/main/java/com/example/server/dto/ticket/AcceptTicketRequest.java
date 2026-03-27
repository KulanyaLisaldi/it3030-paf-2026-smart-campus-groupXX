package com.example.server.dto.ticket;

import jakarta.validation.constraints.NotBlank;

public class AcceptTicketRequest {

    @NotBlank(message = "Technician id is required")
    private String technicianId;

    @NotBlank(message = "Technician name is required")
    private String technicianName;

    public String getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(String technicianId) {
        this.technicianId = technicianId;
    }

    public String getTechnicianName() {
        return technicianName;
    }

    public void setTechnicianName(String technicianName) {
        this.technicianName = technicianName;
    }
}
