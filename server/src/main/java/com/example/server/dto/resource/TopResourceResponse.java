package com.example.server.dto.resource;

public class TopResourceResponse {
    private String resourceId;
    private String code;
    private String name;
    private String type;
    private String location;
    private String imageUrl;
    private long usageCount;

    public TopResourceResponse(String resourceId, String code, String name, String type, String location, String imageUrl, long usageCount) {
        this.resourceId = resourceId;
        this.code = code;
        this.name = name;
        this.type = type;
        this.location = location;
        this.imageUrl = imageUrl;
        this.usageCount = usageCount;
    }

    public String getResourceId() {
        return resourceId;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public String getLocation() {
        return location;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public long getUsageCount() {
        return usageCount;
    }
}
