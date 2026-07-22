package com.aiscript.modules.auth.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;

@Data
public class SendCodeDTO {
    @NotBlank
    private String phone;
}
