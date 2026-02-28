package com.example.server.controller;

import com.example.server.model.TestItem;
import com.example.server.repository.TestItemRepo;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test")
public class TestController {

    private final TestItemRepo repo;

    public TestController(TestItemRepo repo) {
        this.repo = repo;
    }

    @PostMapping
    public TestItem add(@RequestBody TestItem item) {
        return repo.save(item);
    }

    @GetMapping
    public List<TestItem> all() {
        return repo.findAll();
    }
}