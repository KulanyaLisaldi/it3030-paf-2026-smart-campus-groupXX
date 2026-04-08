package com.example.server.repository;

import com.example.server.model.Booking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BookingRepo extends MongoRepository<Booking, String> {
    List<Booking> findByResourceIdAndBookingDateAndStatusIn(String resourceId, String bookingDate, List<String> statuses);

    List<Booking> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    List<Booking> findAllByOrderByCreatedAtDesc();
}
