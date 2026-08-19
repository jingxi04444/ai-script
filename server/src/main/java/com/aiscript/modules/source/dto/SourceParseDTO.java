package com.aiscript.modules.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SourceParseDTO {
    @NotBlank(message = "水滴操作请求号不能为空")
    @Size(max = 80, message = "水滴操作请求号过长")
    private String requestNo;

    @NotNull(message = "水滴费用不能为空")
    @Min(value = 0, message = "水滴费用不能为负数")
    @Max(value = 1000000, message = "水滴费用过大")
    private Long expectedPointCost;
    @NotBlank(message = "项目ID不能为空")
    private String projectId;
    @NotBlank(message = "分享链接不能为空")
    private String url;
    private String mode;
}
