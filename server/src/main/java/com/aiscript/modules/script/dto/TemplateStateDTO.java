package com.aiscript.modules.script.dto;

import lombok.Data;

@Data
public class TemplateStateDTO {
    private String auditStatus;
    private String publishStatus;
    private Boolean locked;
}
