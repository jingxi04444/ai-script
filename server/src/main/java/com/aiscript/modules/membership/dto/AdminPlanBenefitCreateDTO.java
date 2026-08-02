package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminPlanBenefitCreateDTO {
    @NotBlank
    private String code;
    @NotBlank
    private String value;
    private Boolean enabled;
}
