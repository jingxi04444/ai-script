package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptVO {
    private String id;
    private String name;
    private String projectId;
    private String type;
    private String status;
    private String content;
    private String createdAt;
    private String updatedAt;
}
