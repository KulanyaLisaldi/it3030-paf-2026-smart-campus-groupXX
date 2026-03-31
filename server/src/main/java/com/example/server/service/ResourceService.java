package com.example.server.service;

import com.example.server.dto.resource.CreateResourceRequest;
import com.example.server.model.Resource;
import com.example.server.repository.ResourceRepo;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class ResourceService {

    private static final List<String> ALLOWED_TYPES = List.of("LECTURE_HALL", "LAB", "MEETING_ROOM", "EQUIPMENT");
    private static final List<String> ALLOWED_STATUS = List.of("ACTIVE", "OUT_OF_SERVICE");

    private final ResourceRepo resourceRepo;

    public ResourceService(ResourceRepo resourceRepo) {
        this.resourceRepo = resourceRepo;
    }

    public Resource create(CreateResourceRequest request) {
        String code = safeTrim(request.getCode()).toUpperCase(Locale.ROOT);
        String name = safeTrim(request.getName());
        String type = safeTrim(request.getType()).toUpperCase(Locale.ROOT);
        Integer capacity = request.getCapacity();
        String location = safeTrim(request.getLocation());
        String description = safeTrim(request.getDescription());
        String availability = safeTrim(request.getAvailability());
        String status = safeTrim(request.getStatus()).toUpperCase(Locale.ROOT);

        validate(type, status, capacity);

        if (resourceRepo.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException("Resource code already exists");
        }

        Resource resource = new Resource();
        resource.setCode(code);
        resource.setName(name);
        resource.setType(type);
        resource.setCapacity(capacity);
        resource.setLocation(location);
        resource.setDescription(description);
        resource.setAvailability(availability);
        resource.setStatus(status);
        resource.setCreatedAt(Instant.now());
        resource.setUpdatedAt(Instant.now());
        return resourceRepo.save(resource);
    }

    public List<Resource> list(String type, Integer minCapacity, String location, String status) {
        String typeFilter = normalizeFilter(type);
        String statusFilter = normalizeFilter(status);
        String locationFilter = safeTrim(location).toLowerCase(Locale.ROOT);

        return resourceRepo.findAll()
            .stream()
            .filter(r -> typeFilter.isEmpty() || safeTrim(r.getType()).equalsIgnoreCase(typeFilter))
            .filter(r -> statusFilter.isEmpty() || safeTrim(r.getStatus()).equalsIgnoreCase(statusFilter))
            .filter(r -> minCapacity == null || (r.getCapacity() != null && r.getCapacity() >= minCapacity))
            .filter(r -> locationFilter.isEmpty() || safeTrim(r.getLocation()).toLowerCase(Locale.ROOT).contains(locationFilter))
            .sorted(Comparator.comparing(Resource::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    public Optional<Resource> getById(String id) {
        return resourceRepo.findById(id);
    }

    public Optional<Resource> updateStatus(String id, String rawStatus) {
        String status = safeTrim(rawStatus).toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUS.contains(status)) {
            throw new IllegalArgumentException("Invalid status selected");
        }
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Resource resource = maybe.get();
        resource.setStatus(status);
        resource.setUpdatedAt(Instant.now());
        return Optional.of(resourceRepo.save(resource));
    }

    public boolean disable(String id) {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return false;
        }
        Resource resource = maybe.get();
        resource.setStatus("OUT_OF_SERVICE");
        resource.setUpdatedAt(Instant.now());
        resourceRepo.save(resource);
        return true;
    }

    private void validate(String type, String status, Integer capacity) {
        if (!ALLOWED_TYPES.contains(type)) {
            throw new IllegalArgumentException("Invalid resource type selected");
        }
        if (!ALLOWED_STATUS.contains(status)) {
            throw new IllegalArgumentException("Invalid status selected");
        }
        if (capacity == null || capacity < 0) {
            throw new IllegalArgumentException("Capacity must be 0 or greater");
        }
    }

    private String safeTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeFilter(String value) {
        String trimmed = safeTrim(value);
        if (trimmed.isEmpty() || "ALL".equalsIgnoreCase(trimmed)) {
            return "";
        }
        return trimmed;
    }
}
