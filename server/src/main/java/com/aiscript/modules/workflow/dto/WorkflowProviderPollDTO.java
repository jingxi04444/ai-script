package com.aiscript.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WorkflowProviderPollDTO {
    @NotNull
    private Integer tenantId;
    @NotBlank
    private String runId;
    @NotBlank
    private String nodeId;
    @NotBlank
    private String providerId;
    @NotBlank
    private String taskId;
}
