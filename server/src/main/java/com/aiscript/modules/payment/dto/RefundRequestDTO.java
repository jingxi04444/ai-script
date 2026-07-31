package com.aiscript.modules.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RefundRequestDTO {
    @NotBlank
    private String orderNo;
    @Size(max = 500)
    private String reason;
}