package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class AdminMembershipPlanUpdateDTO {
    @NotBlank
    private String name;
    private String description;
    private BigDecimal price;
    private Integer periodDays;
    private Integer displayOrder;
    @NotNull
    private Integer status;
}
