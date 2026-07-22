package com.aiscript.modules.project.dto;

import lombok.Data;

@Data
public class ProjectCreateDTO {
    private String name;
    private String category;
    private String productName;
    private String platform;
    private String videoRatio;
    private String videoType;
}
