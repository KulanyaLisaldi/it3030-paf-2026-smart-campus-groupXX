package com.example.server.controller;

import com.example.server.dto.resource.CreateResourceRequest;
import com.example.server.dto.resource.UpdateResourceStatusRequest;
import com.example.server.model.Resource;
import com.example.server.service.ResourceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateResourceRequest request) {
        Resource created = resourceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message", "Resource created successfully",
                "resource", created
            )
        );
    }

    @GetMapping
    public List<Resource> list(
        @RequestParam(value = "type", required = false) String type,
        @RequestParam(value = "minCapacity", required = false) Integer minCapacity,
        @RequestParam(value = "location", required = false) String location,
        @RequestParam(value = "status", required = false) String status
    ) {
        return resourceService.list(type, minCapacity, location, status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable("id") String id) {
        return resourceService.getById(id)
            .<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Resource not found"))
            );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateResourceStatusRequest request
    ) {
        return resourceService.updateStatus(id, request.getStatus())
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(
                Map.of("message", "Resource status updated successfully", "resource", updated)
            ))
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Resource not found"))
            );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> disable(@PathVariable("id") String id) {
        boolean disabled = resourceService.disable(id);
        if (!disabled) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Resource not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Resource disabled successfully"));
    }
}
