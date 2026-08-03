package com.aiscript.modules.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InternalMembershipAdjustDTO {
    @NotNull(message = "请选择会员套餐")
    private Long planId;

    @NotNull(message = "请选择套餐周期")
    private Long skuId;

    @NotNull(message = "请输入有效天数")
    @Min(value = 1, message = "有效天数不能少于1天")
    @Max(value = 3650, message = "有效天数不能超过3650天")
    private Integer validDays;
}
