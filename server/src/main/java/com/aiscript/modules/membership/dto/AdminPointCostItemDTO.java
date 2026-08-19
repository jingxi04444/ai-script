package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminPointCostItemDTO {
    @NotNull
    private Long planId;
    @NotBlank
    private String benefitCode;
    @NotNull
    @Min(0)
    @Max(1000000)
    private Long value;
}
