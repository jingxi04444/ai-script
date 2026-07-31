package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class AdminMembershipSkuUpdateDTO {
    @NotBlank
    private String name;
    @NotBlank
    private String billingMode;
    @NotBlank
    private String periodUnit;
    @Min(1)
    private Integer periodCount;
    @NotNull
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer refundDays;
    private Integer displayOrder;
    @NotNull
    private Integer status;
}
