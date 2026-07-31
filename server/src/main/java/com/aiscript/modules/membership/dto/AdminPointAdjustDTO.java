package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminPointAdjustDTO {
    @NotBlank
    private String userId;
    @NotNull
    private Long changePoints;
    private String remark;
}
