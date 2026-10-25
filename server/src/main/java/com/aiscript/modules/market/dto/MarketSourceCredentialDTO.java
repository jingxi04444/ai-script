package com.aiscript.modules.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MarketSourceCredentialDTO {
    @NotNull(message = "租户ID不能为空")
    private Integer tenantId;
    @NotBlank(message = "平台不能为空")
    private String platform;
}
