package com.aiscript.modules.auth.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class RegisterDTO {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    private String email;
    private String phone;
    private String code;
}
