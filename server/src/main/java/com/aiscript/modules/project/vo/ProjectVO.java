package com.aiscript.modules.project.vo;

import lombok.Data;

@Data
public class ProjectVO {
    private String id;
    private String name;
    private String avatarUrl;
    private String announcement;
    private String userId;
    private String username;
    private String category;
    private String status;
    private Integer briefCount;
    private Integer scriptCount;
    private Integer videoCount;
    private String createdAt;
    private String updatedAt;
}
