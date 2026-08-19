package com.aiscript.modules.script.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GenerateScriptDTO {
    @NotBlank(message = "水滴操作请求号不能为空")
    @Size(max = 80, message = "水滴操作请求号过长")
    private String requestNo;

    @NotNull(message = "水滴费用不能为空")
    @Min(value = 0, message = "水滴费用不能为负数")
    @Max(value = 1000000, message = "水滴费用过大")
    private Long expectedPointCost;
    private String projectId;
    private String type;
    private String templateId;
    @Size(max = 80, message = "原创大类编码过长")
    private String originalCategoryId;
    @Size(max = 120, message = "原创大类名称过长")
    private String originalCategoryName;
    @Size(max = 80, message = "原创子类编码过长")
    private String originalScenarioId;
    @Size(max = 120, message = "原创子类名称过长")
    private String originalScenarioName;
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
