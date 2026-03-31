package com.example.server.repository;

import com.example.server.model.Resource;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ResourceRepo extends MongoRepository<Resource, String> {
    Optional<Resource> findByCodeIgnoreCase(String code);
}
