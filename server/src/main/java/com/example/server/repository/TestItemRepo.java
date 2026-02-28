package com.example.server.repository;

import com.example.server.model.TestItem;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TestItemRepo extends MongoRepository<TestItem, String> {
}