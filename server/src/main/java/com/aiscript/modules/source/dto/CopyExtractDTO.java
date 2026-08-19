package com.aiscript.modules.source.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CopyExtractDTO {
    @NotBlank(message = "项目ID不能为空")
    private String projectId;
    private String videoUrl;
    private String text;
}
