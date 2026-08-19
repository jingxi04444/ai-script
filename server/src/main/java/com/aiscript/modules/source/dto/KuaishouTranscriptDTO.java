package com.aiscript.modules.source.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class KuaishouTranscriptDTO {
    @NotBlank(message = "快手分享链接不能为空")
    private String url;
}
