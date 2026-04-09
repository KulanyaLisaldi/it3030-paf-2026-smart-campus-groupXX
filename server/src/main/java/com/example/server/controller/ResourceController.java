package com.example.server.controller;

import com.example.server.dto.resource.CreateResourceRequest;
import com.example.server.dto.resource.TopResourceResponse;
import com.example.server.dto.resource.UpdateResourceRequest;
import com.example.server.dto.resource.UpdateResourceStatusRequest;
import com.example.server.model.Resource;
import com.example.server.service.ResourceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
    public ResponseEntity<?> create(@Valid @RequestBody CreateResourceRequest request) throws IOException {
        Resource created = resourceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message", "Resource created successfully",
                "resource", created
            )
        );
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createMultipart(
        @RequestParam("code") String code,
        @RequestParam("name") String name,
        @RequestParam("type") String type,
        @RequestParam("capacity") Integer capacity,
        @RequestParam("location") String location,
        @RequestParam(value = "description", required = false) String description,
        @RequestParam(value = "availability", required = false) String availability,
        @RequestParam("status") String status,
        @RequestParam(value = "images", required = false) MultipartFile[] images
    ) throws IOException {
        Resource created = resourceService.createWithImage(
            code, name, type, capacity, location, description, availability, status, images
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of("message", "Resource created successfully", "resource", created)
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

    @GetMapping("/top-used")
    public List<TopResourceResponse> topUsed(
        @RequestParam(value = "limit", required = false, defaultValue = "4") Integer limit
    ) {
        return resourceService.getTopUsedResources(limit == null ? 4 : limit);
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

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
        @PathVariable("id") String id,
        @Valid @RequestBody UpdateResourceRequest request
    ) {
        return resourceService.update(id, request)
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(
                Map.of("message", "Resource updated successfully", "resource", updated)
            ))
            .orElseGet(() -> ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Resource not found"))
            );
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMultipart(
        @PathVariable("id") String id,
        @RequestParam("name") String name,
        @RequestParam("type") String type,
        @RequestParam("capacity") Integer capacity,
        @RequestParam("location") String location,
        @RequestParam(value = "description", required = false) String description,
        @RequestParam(value = "availability", required = false) String availability,
        @RequestParam("status") String status,
        @RequestParam(value = "images", required = false) MultipartFile[] images,
        @RequestParam(value = "keptImageUrls", required = false) List<String> keptImageUrls
    ) throws IOException {
        return resourceService.updateWithImage(
                id, name, type, capacity, location, description, availability, status, images, keptImageUrls
            )
            .<ResponseEntity<?>>map(updated -> ResponseEntity.ok(
                Map.of("message", "Resource updated successfully", "resource", updated)
            ))
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
    public ResponseEntity<?> delete(@PathVariable("id") String id) {
        boolean deleted = resourceService.delete(id);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Resource not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Resource deleted successfully"));
    }
}
