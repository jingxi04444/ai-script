package com.aiscript.modules.project.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProjectStatsRow {
    private Integer id;
    private Integer ownerId;
    private String projectName;
    private String avatarUrl;
    private String announcement;
    private String category;
    private String status;
    private Integer briefCount;
    private Integer scriptCount;
    private Integer videoCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
