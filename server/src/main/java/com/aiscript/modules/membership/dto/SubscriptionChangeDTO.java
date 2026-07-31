package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SubscriptionChangeDTO {
    @NotBlank
    private String skuId;
}