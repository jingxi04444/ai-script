package com.aiscript.modules.script.dto;

import lombok.Data;

@Data
public class ScriptSaveDTO {
    private String name;
    private String projectId;
    private String type;
    private String status;
    private String content;
}
