package com.aiscript.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WorkflowRunCreateDTO {
    private Long workflowId;

    private Integer workflowVersion;

    @NotBlank(message = "工作流模式不能为空")
    private String mode;

    @NotBlank(message = "工作流内容不能为空")
    @Size(max = 2_000_000, message = "工作流内容超过2MB限制")
    private String graphJson;

    @Size(max = 160, message = "幂等键长度不能超过160个字符")
    private String idempotencyKey;

    private String inputJson;
}
