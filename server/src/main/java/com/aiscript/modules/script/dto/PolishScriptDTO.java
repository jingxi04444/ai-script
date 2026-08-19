package com.aiscript.modules.script.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PolishScriptDTO {
    @NotBlank(message = "修改要求不能为空")
    private String instruction;

    @NotBlank(message = "水滴操作请求号不能为空")
    @Size(max = 80, message = "水滴操作请求号过长")
    private String requestNo;

    @NotNull(message = "水滴费用不能为空")
    @Min(value = 0, message = "水滴费用不能为负数")
    @Max(value = 1000000, message = "水滴费用过大")
    private Long expectedPointCost;
    private String content;
    private String briefId;
    private String productFrameAssetId;
    private String productImage;
    private String productFrameFileName;
    private String productFrameContent;
}
