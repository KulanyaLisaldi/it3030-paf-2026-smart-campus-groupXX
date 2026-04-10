package com.example.server.controller;

import com.example.server.dto.admin.CreateTechnicianRequest;
import com.example.server.dto.auth.AuthUserResponse;
import com.example.server.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/technicians")
public class AdminTechnicianController {

    private final AuthService authService;

    public AdminTechnicianController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public List<AuthUserResponse> listTechnicians() {
        return authService.listTechnicians();
    }

    @PostMapping
    public ResponseEntity<?> createTechnician(@Valid @RequestBody CreateTechnicianRequest request) {
        try {
            AuthUserResponse created = authService.createTechnician(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Technician created. A verification email was sent to their address.",
                "user", created
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", ex.getMessage()));
        }
    }
}
