package com.aiscript.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

@Data
public class InternalUserCreateDTO {
    @NotBlank(message = "员工姓名不能为空")
    @Size(max = 80, message = "员工姓名不能超过80个字符")
    private String username;

    @NotBlank(message = "登录邮箱不能为空")
    @Email(message = "登录邮箱格式不正确")
    @Size(max = 160, message = "登录邮箱不能超过160个字符")
    private String email;

    @Size(max = 40, message = "手机号不能超过40个字符")
    private String phone;

    @NotBlank(message = "初始密码不能为空")
    @Size(min = 6, max = 72, message = "初始密码长度必须为6到72位")
    @ToString.Exclude
    private String password;

    @NotNull(message = "请选择会员套餐")
    private Long planId;

    @NotNull(message = "请选择套餐周期")
    private Long skuId;

    @NotNull(message = "请输入有效天数")
    @Min(value = 1, message = "有效天数不能少于1天")
    @Max(value = 3650, message = "有效天数不能超过3650天")
    private Integer validDays;
}
