package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptListVO {
    private String id;
    private String name;
    private String projectId;
    private String briefId;
    private String briefName;
    private String type;
    private String status;
    private String createdAt;
    private String updatedAt;
}
