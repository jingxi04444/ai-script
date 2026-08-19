package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptVO {
    private String id;
    private String name;
    private String projectId;
    private String briefId;
    private String type;
    private String duration;
    private String format;
    private String formatName;
    private String templateId;
    private String templateName;
    private String originalCategoryId;
    private String originalCategoryName;
    private String originalScenarioId;
    private String originalScenarioName;
    private String status;
    private String content;
    private String createdAt;
    private String updatedAt;
}
