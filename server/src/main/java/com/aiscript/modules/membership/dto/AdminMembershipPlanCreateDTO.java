package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class AdminMembershipPlanCreateDTO {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    @NotNull
    private Integer level;
    private Boolean free;
    @NotNull
    @Min(1)
    private Integer periodDays;
    @NotNull
    private BigDecimal price;
    private String description;
    private Integer displayOrder;
    @NotNull
    private Integer status;
}
