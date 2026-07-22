package com.aiscript.modules.source.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LinkExtractDTO {
    @NotBlank(message = "文本内容不能为空")
    private String text;
}
