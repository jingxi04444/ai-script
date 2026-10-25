package com.aiscript.modules.market.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MarketSourceConfigSaveDTO {
    @Size(max = 30000, message = "Cookie 内容过长")
    private String cookie;
    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "提醒手机号格式不正确")
    private String alertPhone;
    private Boolean enabled;
    private Boolean alertEnabled;
    private Boolean clearAlertPhone;
}
