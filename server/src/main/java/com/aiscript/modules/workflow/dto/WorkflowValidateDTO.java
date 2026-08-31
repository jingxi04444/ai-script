package com.aiscript.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WorkflowValidateDTO {
    @NotBlank
    private String graphJson;
}
