package com.example.server.service;

import com.example.server.dto.resource.CreateResourceRequest;
import com.example.server.dto.resource.TopResourceResponse;
import com.example.server.dto.resource.UpdateResourceRequest;
import com.example.server.model.Booking;
import com.example.server.model.Resource;
import com.example.server.model.User;
import com.example.server.repository.BookingRepo;
import com.example.server.repository.ResourceRepo;
import com.example.server.repository.UserRepo;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
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
    private static final List<String> ACTIVE_BOOKING_STATUSES = List.of("PENDING", "APPROVED", "CHECKED_IN");

    private final ResourceRepo resourceRepo;
    private final BookingRepo bookingRepo;
    private final UserRepo userRepo;
    private final NotificationService notificationService;

    public ResourceService(ResourceRepo resourceRepo, BookingRepo bookingRepo, UserRepo userRepo, NotificationService notificationService) {
        this.resourceRepo = resourceRepo;
        this.bookingRepo = bookingRepo;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
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
        validateAvailabilityFormat(availability);

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

    public Optional<AvailabilityUpdateResult> update(String id, UpdateResourceRequest request) {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }

        String type = safeTrim(request.getType()).toUpperCase(Locale.ROOT);
        String status = safeTrim(request.getStatus()).toUpperCase(Locale.ROOT);
        Integer capacity = request.getCapacity();
        validate(type, status, capacity);

        Resource resource = maybe.get();
        String newAvailability = safeTrim(request.getAvailability());
        validateAvailabilityFormat(newAvailability);
        resource.setName(safeTrim(request.getName()));
        resource.setType(type);
        resource.setCapacity(capacity);
        resource.setLocation(safeTrim(request.getLocation()));
        resource.setDescription(safeTrim(request.getDescription()));
        String oldAvailability = safeTrim(resource.getAvailability());
        resource.setAvailability(newAvailability);
        resource.setStatus(status);
        resource.setUpdatedAt(Instant.now());
        Resource savedResource = resourceRepo.save(resource);
        BookingConflictResult bookingConflictResult = applyAvailabilityRule(
            safeTrim(savedResource.getId()),
            oldAvailability,
            newAvailability,
            safeTrim(request.getConflictAction())
        );
        return Optional.of(new AvailabilityUpdateResult(savedResource, oldAvailability, newAvailability, bookingConflictResult));
    }

    public Optional<AvailabilityUpdateResult> updateWithImage(
        String id,
        String name,
        String type,
        Integer capacity,
        String location,
        String description,
        String availability,
        String status,
        MultipartFile[] images,
        List<String> keptImageUrls,
        String conflictAction
    ) throws IOException {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }

        String normalizedType = safeTrim(type).toUpperCase(Locale.ROOT);
        String normalizedStatus = safeTrim(status).toUpperCase(Locale.ROOT);
        validate(normalizedType, normalizedStatus, capacity);

        Resource resource = maybe.get();
        String newAvailability = safeTrim(availability);
        validateAvailabilityFormat(newAvailability);
        resource.setName(safeTrim(name));
        resource.setType(normalizedType);
        resource.setCapacity(capacity);
        resource.setLocation(safeTrim(location));
        resource.setDescription(safeTrim(description));
        String oldAvailability = safeTrim(resource.getAvailability());
        resource.setAvailability(newAvailability);
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
        Resource savedResource = resourceRepo.save(resource);
        BookingConflictResult bookingConflictResult = applyAvailabilityRule(
            safeTrim(savedResource.getId()),
            oldAvailability,
            newAvailability,
            safeTrim(conflictAction)
        );
        return Optional.of(new AvailabilityUpdateResult(savedResource, oldAvailability, newAvailability, bookingConflictResult));
    }

    public Optional<AvailabilityPreviewResult> previewAvailabilityConflicts(String id, String proposedAvailability) {
        Optional<Resource> maybe = resourceRepo.findById(id);
        if (maybe.isEmpty()) {
            return Optional.empty();
        }
        Resource resource = maybe.get();
        String oldAvailability = safeTrim(resource.getAvailability());
        String newAvailability = safeTrim(proposedAvailability);
        BookingConflictResult bookingConflictResult = evaluateAvailabilityConflicts(safeTrim(resource.getId()), newAvailability);
        return Optional.of(new AvailabilityPreviewResult(
            safeTrim(resource.getId()),
            oldAvailability,
            newAvailability,
            bookingConflictResult.affectedCount,
            bookingConflictResult.conflictingBookings
        ));
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

    /** Ensures non-empty availability is HH:mm-HH:mm with start strictly before end. */
    private void validateAvailabilityFormat(String rawAvailability) {
        String value = safeTrim(rawAvailability);
        if (value.isEmpty()) {
            return;
        }
        parseAvailabilityWindow(value);
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

    private Optional<String> resolveBookingOwnerUserId(Booking booking) {
        String ownerRef = safeTrim(booking == null ? "" : booking.getCreatedBy());
        if (ownerRef.isEmpty()) {
            return Optional.empty();
        }
        Optional<User> byId = userRepo.findById(ownerRef);
        if (byId.isPresent()) {
            return Optional.ofNullable(byId.get().getId());
        }
        return userRepo.findByEmail(ownerRef.toLowerCase(Locale.ROOT)).map(User::getId);
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

    private BookingConflictResult applyAvailabilityRule(
        String resourceId,
        String oldAvailability,
        String newAvailability,
        String conflictActionRaw
    ) {
        BookingConflictResult result = evaluateAvailabilityConflicts(resourceId, newAvailability);
        String conflictAction = safeTrim(conflictActionRaw).toUpperCase(Locale.ROOT);
        boolean cancelConflicts = "CANCEL_CONFLICTING".equals(conflictAction);
        if (result.changedBookings.isEmpty()) {
            return result;
        }
        for (Booking booking : result.changedBookings) {
            if (cancelConflicts && Boolean.TRUE.equals(booking.getOutsideAvailability())) {
                String status = safeTrim(booking.getStatus()).toUpperCase(Locale.ROOT);
                if ("PENDING".equals(status) || "APPROVED".equals(status)) {
                    booking.setStatus("CANCELLED");
                    String cancellationMessage = "We sincerely apologize for the inconvenience. Your booking has been cancelled due to maintenance requirements. Kindly reschedule your booking at your earliest convenience.\n\nThank you for your understanding.\n\nBest regards,\nAdmin";
                    booking.setCancellationReason(cancellationMessage);
                    booking.setReviewReason("");
                    resolveBookingOwnerUserId(booking).ifPresent(userId ->
                        notificationService.createAndPush(
                            userId,
                            "BOOKING_CANCELLED_BY_ADMIN",
                            "Booking Cancelled",
                            cancellationMessage,
                            "BOOKING",
                            safeTrim(booking.getId()),
                            "/account/bookings"
                        )
                    );
                }
            }
            booking.setUpdatedAt(Instant.now());
        }
        bookingRepo.saveAll(result.changedBookings);
        return result;
    }

    private BookingConflictResult evaluateAvailabilityConflicts(String resourceId, String newAvailability) {
        AvailabilityWindow window = parseAvailabilityWindow(newAvailability);
        LocalDate today = LocalDate.now();
        List<Booking> candidates = bookingRepo.findByResourceIdAndStatusInAndBookingDateGreaterThanEqual(
            resourceId,
            ACTIVE_BOOKING_STATUSES,
            today.toString()
        );
        List<Booking> changed = new java.util.ArrayList<>();
        List<Map<String, String>> conflicts = new java.util.ArrayList<>();
        for (Booking booking : candidates) {
            boolean isOutside = isOutsideWindow(booking, window);
            boolean oldFlag = Boolean.TRUE.equals(booking.getOutsideAvailability());
            if (oldFlag != isOutside) {
                booking.setOutsideAvailability(isOutside);
                changed.add(booking);
            }
            if (isOutside) {
                conflicts.add(Map.of(
                    "bookingId", safeTrim(booking.getId()),
                    "bookingDate", safeTrim(booking.getBookingDate()),
                    "startTime", safeTrim(booking.getStartTime()),
                    "endTime", safeTrim(booking.getEndTime()),
                    "status", safeTrim(booking.getStatus()),
                    "resourceName", safeTrim(booking.getResourceName()),
                    "createdBy", safeTrim(booking.getCreatedBy())
                ));
            }
        }
        return new BookingConflictResult(conflicts.size(), conflicts, changed);
    }

    private boolean isOutsideWindow(Booking booking, AvailabilityWindow window) {
        try {
            LocalTime start = LocalTime.parse(safeTrim(booking.getStartTime()));
            LocalTime end = LocalTime.parse(safeTrim(booking.getEndTime()));
            return start.isBefore(window.start) || end.isAfter(window.end);
        } catch (DateTimeParseException ex) {
            return false;
        }
    }

    private AvailabilityWindow parseAvailabilityWindow(String rawAvailability) {
        String value = safeTrim(rawAvailability);
        if (value.isEmpty()) {
            return new AvailabilityWindow(LocalTime.parse("08:00"), LocalTime.parse("18:00"));
        }
        String[] parts = value.split("-");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Availability must be in HH:mm-HH:mm format");
        }
        try {
            LocalTime start = LocalTime.parse(safeTrim(parts[0]));
            LocalTime end = LocalTime.parse(safeTrim(parts[1]));
            if (!start.isBefore(end)) {
                throw new IllegalArgumentException("Availability end time must be later than start time");
            }
            return new AvailabilityWindow(start, end);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Availability must be in HH:mm-HH:mm format");
        }
    }

    private static final class AvailabilityWindow {
        private final LocalTime start;
        private final LocalTime end;

        private AvailabilityWindow(LocalTime start, LocalTime end) {
            this.start = start;
            this.end = end;
        }
    }

    private static final class BookingConflictResult {
        private final int affectedCount;
        private final List<Map<String, String>> conflictingBookings;
        private final List<Booking> changedBookings;

        private BookingConflictResult(int affectedCount, List<Map<String, String>> conflictingBookings, List<Booking> changedBookings) {
            this.affectedCount = affectedCount;
            this.conflictingBookings = conflictingBookings;
            this.changedBookings = changedBookings;
        }
    }

    public static final class AvailabilityPreviewResult {
        private final String resourceId;
        private final String oldAvailability;
        private final String newAvailability;
        private final int affectedBookings;
        private final List<Map<String, String>> conflictingBookings;

        public AvailabilityPreviewResult(
            String resourceId,
            String oldAvailability,
            String newAvailability,
            int affectedBookings,
            List<Map<String, String>> conflictingBookings
        ) {
            this.resourceId = resourceId;
            this.oldAvailability = oldAvailability;
            this.newAvailability = newAvailability;
            this.affectedBookings = affectedBookings;
            this.conflictingBookings = conflictingBookings;
        }

        public String getResourceId() { return resourceId; }
        public String getOldAvailability() { return oldAvailability; }
        public String getNewAvailability() { return newAvailability; }
        public int getAffectedBookings() { return affectedBookings; }
        public List<Map<String, String>> getConflictingBookings() { return conflictingBookings; }
    }

    public static final class AvailabilityUpdateResult {
        private final Resource resource;
        private final String oldAvailability;
        private final String newAvailability;
        private final int affectedBookings;
        private final List<Map<String, String>> conflictingBookings;

        public AvailabilityUpdateResult(
            Resource resource,
            String oldAvailability,
            String newAvailability,
            BookingConflictResult bookingConflictResult
        ) {
            this.resource = resource;
            this.oldAvailability = oldAvailability;
            this.newAvailability = newAvailability;
            this.affectedBookings = bookingConflictResult.affectedCount;
            this.conflictingBookings = bookingConflictResult.conflictingBookings;
        }

        public Resource getResource() { return resource; }
        public String getOldAvailability() { return oldAvailability; }
        public String getNewAvailability() { return newAvailability; }
        public int getAffectedBookings() { return affectedBookings; }
        public List<Map<String, String>> getConflictingBookings() { return conflictingBookings; }
    }
}
