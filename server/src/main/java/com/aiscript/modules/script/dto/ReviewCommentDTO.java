package com.aiscript.modules.script.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewCommentDTO {
    private String parentId;
    private String versionId;
    private Integer rowIndex;
    private String columnKey;
    @NotBlank(message = "批注内容不能为空")
    private String content;
}
