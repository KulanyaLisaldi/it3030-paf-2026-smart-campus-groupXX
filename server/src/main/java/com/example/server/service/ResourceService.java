package com.example.server.service;

import com.example.server.dto.resource.CreateResourceRequest;
import com.example.server.dto.resource.UpdateResourceRequest;
import com.example.server.model.Resource;
import com.example.server.repository.ResourceRepo;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class ResourceService {

    private static final List<String> ALLOWED_TYPES = List.of("LECTURE_HALL", "LAB", "MEETING_ROOM", "EQUIPMENT");
    private static final List<String> ALLOWED_STATUS = List.of("ACTIVE", "OUT_OF_SERVICE");

    private final ResourceRepo resourceRepo;

    public ResourceService(ResourceRepo resourceRepo) {
        this.resourceRepo = resourceRepo;
    }

    public Resource create(CreateResourceRequest request) throws IOException {
        return createInternal(
            request.getCode(),
            request.getName(),
            request.getType(),
            request.getCapacity(),
            request.getLocation(),
            request.getDescription(),
            request.getAvailability(),
            request.getStatus(),
            null
        );
    }

    public Resource createWithImage(
        String code,
        String name,
        String type,
        Integer capacity,
        String location,
        String description,
        String availability,
        String status,
        MultipartFile image
    ) throws IOException {
        return createInternal(code, name, type, capacity, location, description, availability, status, image);
    }

    private Resource createInternal(
        String rawCode,
        String rawName,
        String rawType,
        Integer capacity,
        String rawLocation,
        String rawDescription,
        String rawAvailability,
        String rawStatus,
        MultipartFile image
    ) throws IOException {
        String code = safeTrim(rawCode).toUpperCase(Locale.ROOT);
        String name = safeTrim(rawName);
        String type = safeTrim(rawType).toUpperCase(Locale.ROOT);
        String location = safeTrim(rawLocation);
        String description = safeTrim(rawDescription);
        String availability = safeTrim(rawAvailability);
        String status = safeTrim(rawStatus).toUpperCase(Locale.ROOT);

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
        resource.setImageUrl(saveImage(image));
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

    public Optional<Resource> update(String id, UpdateResourceRequest request) {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }

        String type = safeTrim(request.getType()).toUpperCase(Locale.ROOT);
        String status = safeTrim(request.getStatus()).toUpperCase(Locale.ROOT);
        Integer capacity = request.getCapacity();
        validate(type, status, capacity);

        Resource resource = maybe.get();
        resource.setName(safeTrim(request.getName()));
        resource.setType(type);
        resource.setCapacity(capacity);
        resource.setLocation(safeTrim(request.getLocation()));
        resource.setDescription(safeTrim(request.getDescription()));
        resource.setAvailability(safeTrim(request.getAvailability()));
        resource.setStatus(status);
        resource.setUpdatedAt(Instant.now());
        return Optional.of(resourceRepo.save(resource));
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

    public boolean delete(String id) {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return false;
        }
        resourceRepo.deleteById(id);
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

    private String saveImage(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty()) {
            return "";
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        Path uploadDir = Paths.get("uploads", "resources").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        String originalName = image.getOriginalFilename() == null ? "resource-image" : image.getOriginalFilename();
        String safeFileName = UUID.randomUUID() + "-" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path destination = uploadDir.resolve(safeFileName);
        Files.copy(image.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/resources/" + safeFileName;
    }
}
