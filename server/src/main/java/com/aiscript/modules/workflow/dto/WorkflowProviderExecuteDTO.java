package com.aiscript.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import lombok.Data;

@Data
public class WorkflowProviderExecuteDTO {
    @NotNull
    private Integer tenantId;
    @NotBlank
    private String runId;
    @NotBlank
    private String nodeId;
    @NotBlank
    private String nodeKind;
    private Map<String, Object> inputs;
    private Map<String, Object> config;
}
