package com.example.server.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "test_items")
public class TestItem {
    @Id
    private String id;
    private String name;

    public TestItem() {}
    public TestItem(String name) { this.name = name; }

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}