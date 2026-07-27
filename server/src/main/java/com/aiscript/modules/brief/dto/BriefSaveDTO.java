package com.aiscript.modules.brief.dto;

import lombok.Data;

@Data
public class BriefSaveDTO {
    private String name;
    private String projectId;
    private String productName;
    private String productModel;
    private String price;
    private String slogan;
    private String primarySellingPoint;
    private String targetAudience;
    private String targetScene;
    private String otherRequirements;
    private String briefContent;
    private String richContent;
    private Integer isShared;
    private Integer shareEnabled;
    private Boolean forceNewVersion;
}
