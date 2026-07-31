package com.aiscript.modules.payment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RefundReviewDTO {
    @NotNull
    private Boolean approved;
    @Size(max = 500)
    private String remark;
}