package com.example.server.service;

import com.example.server.dto.resource.CreateResourceRequest;
import com.example.server.dto.resource.TopResourceResponse;
import com.example.server.dto.resource.UpdateResourceRequest;
import com.example.server.model.Booking;
import com.example.server.model.Resource;
import com.example.server.repository.BookingRepo;
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
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private static final List<String> ALLOWED_TYPES = List.of("LECTURE_HALL", "LAB", "MEETING_ROOM", "EQUIPMENT");
    private static final List<String> ALLOWED_STATUS = List.of("ACTIVE", "OUT_OF_SERVICE");
    private static final Set<String> COUNTED_BOOKING_STATUSES = Set.of("PENDING", "APPROVED", "CHECKED_IN");
    private static final int MAX_IMAGES = 3;

    private final ResourceRepo resourceRepo;
    private final BookingRepo bookingRepo;

    public ResourceService(ResourceRepo resourceRepo, BookingRepo bookingRepo) {
        this.resourceRepo = resourceRepo;
        this.bookingRepo = bookingRepo;
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
        MultipartFile[] images
    ) throws IOException {
        return createInternal(code, name, type, capacity, location, description, availability, status, images);
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
        MultipartFile[] images
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
        List<String> savedImages = saveImages(images);
        resource.setImageUrls(savedImages);
        resource.setImageUrl(savedImages.isEmpty() ? "" : savedImages.get(0));
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

    public List<TopResourceResponse> getTopUsedResources(int limit) {
        int safeLimit = limit <= 0 ? 4 : Math.min(limit, 20);
        List<Resource> resources = resourceRepo.findAll();
        if (resources.isEmpty()) {
            return List.of();
        }
        Map<String, Resource> resourcesById = resources.stream()
            .filter(r -> safeTrim(r.getId()).length() > 0)
            .collect(Collectors.toMap(
                r -> safeTrim(r.getId()),
                Function.identity(),
                (a, b) -> a
            ));

        Map<String, Long> usageByResource = bookingRepo.findAll().stream()
            .filter(b -> COUNTED_BOOKING_STATUSES.contains(safeTrim(b.getStatus()).toUpperCase(Locale.ROOT)))
            .map(Booking::getResourceId)
            .map(this::safeTrim)
            .filter(resourcesById::containsKey)
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        Map<String, Long> sorted = usageByResource.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
            .limit(safeLimit)
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                Map.Entry::getValue,
                (a, b) -> a,
                LinkedHashMap::new
            ));

        return sorted.entrySet().stream().map(e -> {
            Resource r = resourcesById.get(e.getKey());
            String imageUrl = (r.getImageUrls() != null && !r.getImageUrls().isEmpty()) ? r.getImageUrls().get(0) : safeTrim(r.getImageUrl());
            return new TopResourceResponse(
                safeTrim(r.getId()),
                safeTrim(r.getCode()),
                safeTrim(r.getName()),
                safeTrim(r.getType()),
                safeTrim(r.getLocation()),
                imageUrl,
                e.getValue()
            );
        }).toList();
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

    public Optional<Resource> updateWithImage(
        String id,
        String name,
        String type,
        Integer capacity,
        String location,
        String description,
        String availability,
        String status,
        MultipartFile[] images,
        List<String> keptImageUrls
    ) throws IOException {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }

        String normalizedType = safeTrim(type).toUpperCase(Locale.ROOT);
        String normalizedStatus = safeTrim(status).toUpperCase(Locale.ROOT);
        validate(normalizedType, normalizedStatus, capacity);

        Resource resource = maybe.get();
        resource.setName(safeTrim(name));
        resource.setType(normalizedType);
        resource.setCapacity(capacity);
        resource.setLocation(safeTrim(location));
        resource.setDescription(safeTrim(description));
        resource.setAvailability(safeTrim(availability));
        resource.setStatus(normalizedStatus);

        List<String> existing = existingImageUrls(resource);
        Set<String> existingSet = new HashSet<>(existing);
        List<String> kept = (keptImageUrls == null ? List.<String>of() : keptImageUrls)
            .stream()
            .map(this::safeTrim)
            .filter(s -> !s.isBlank() && existingSet.contains(s))
            .distinct()
            .toList();

        for (String oldUrl : existing) {
            if (!kept.contains(oldUrl)) {
                deleteImageIfLocal(oldUrl);
            }
        }

        List<String> savedNew = saveImages(images);
        if (kept.size() + savedNew.size() > MAX_IMAGES) {
            for (String u : savedNew) deleteImageIfLocal(u);
            throw new IllegalArgumentException("You can upload up to 3 images only");
        }

        List<String> finalImages = new java.util.ArrayList<>(kept);
        finalImages.addAll(savedNew);
        resource.setImageUrls(finalImages);
        resource.setImageUrl(finalImages.isEmpty() ? "" : finalImages.get(0));

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
        for (String imageUrl : existingImageUrls(maybe.get())) {
            deleteImageIfLocal(imageUrl);
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

    private List<String> saveImages(MultipartFile[] images) throws IOException {
        if (images == null || images.length == 0) {
            return List.of();
        }
        List<MultipartFile> valid = java.util.Arrays.stream(images)
            .filter(f -> f != null && !f.isEmpty())
            .toList();
        if (valid.size() > MAX_IMAGES) {
            throw new IllegalArgumentException("You can upload up to 3 images only");
        }
        Path uploadDir = Paths.get("uploads", "resources").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        List<String> urls = new java.util.ArrayList<>();
        for (MultipartFile image : valid) {
            String contentType = image.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Only image files are allowed");
            }
            String originalName = image.getOriginalFilename() == null ? "resource-image" : image.getOriginalFilename();
            String safeFileName = UUID.randomUUID() + "-" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path destination = uploadDir.resolve(safeFileName);
            Files.copy(image.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            urls.add("/uploads/resources/" + safeFileName);
        }
        return urls;
    }

    private void deleteImageIfLocal(String imageUrl) {
        String url = safeTrim(imageUrl);
        if (url.isEmpty() || !url.startsWith("/uploads/resources/")) {
            return;
        }
        try {
            String fileName = url.substring("/uploads/resources/".length());
            if (fileName.isBlank()) {
                return;
            }
            Path filePath = Paths.get("uploads", "resources", fileName).toAbsolutePath().normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
        }
    }

    private List<String> existingImageUrls(Resource resource) {
        List<String> urls = resource.getImageUrls() == null ? List.of() : resource.getImageUrls().stream().filter(s -> s != null && !s.isBlank()).toList();
        if (!urls.isEmpty()) {
            return urls;
        }
        String single = safeTrim(resource.getImageUrl());
        if (single.isEmpty()) {
            return List.of();
        }
        return List.of(single);
    }
}
