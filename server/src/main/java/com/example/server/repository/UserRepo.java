package com.example.server.repository;

import com.example.server.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.server.model.UserRole;

import java.util.List;
import java.util.Optional;

public interface UserRepo extends MongoRepository<User, String> {
    boolean existsByEmail(String email);

    boolean existsByRole(UserRole role);

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleSubject(String googleSubject);

    List<User> findByRole(UserRole role);
}
