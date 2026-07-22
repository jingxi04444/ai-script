package com.aiscript.modules.project.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ProjectUpdateDTO extends ProjectCreateDTO {
    private String status;
    private String currentStep;
}
