package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FreeTrialActivateDTO {
    @NotBlank(message = "请选择免费套餐的订阅方案")
    private String skuId;
}
