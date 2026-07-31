package com.aiscript.modules.script.dto;

import lombok.Data;

@Data
public class GenerateScriptDTO {
    private String requestNo;
    private String projectId;
    private String type;
    private String templateId;
    private String briefId;
    private String referenceUrl;
    private String referenceCopy;
    private String structureAnalysis;
    private String prompt;
    private String duration;
    private String format;
    private String formatRequirement;
    private String productFrame;
    private String productFrameAssetId;
    private String productImage;
    private String productFrameFileName;
    private String productFrameContent;
}
