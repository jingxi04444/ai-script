package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class AdminPointPackageCreateDTO {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal price;
    @NotNull
    @Min(1)
    private Long points;
    private String description;
    private Integer displayOrder;
    @NotNull
    private Integer status;
}
