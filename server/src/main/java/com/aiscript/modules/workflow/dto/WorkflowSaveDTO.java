package com.aiscript.modules.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WorkflowSaveDTO {
    @Size(max = 120)
    private String name;

    @NotBlank
    @Size(max = 20)
    private String mode;

    @NotBlank
    private String graphJson;
}
