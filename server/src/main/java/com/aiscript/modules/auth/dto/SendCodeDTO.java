package com.aiscript.modules.auth.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Data
public class SendCodeDTO {
    @NotBlank
    @Pattern(regexp = "^1\\d{10}$", message = "手机号格式不正确")
    private String phone;

    @Pattern(regexp = "^(register|login|bind)$", message = "验证码场景不正确")
    private String scene = "login";
}
