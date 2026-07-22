package com.aiscript.modules.payment.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentOrderDTO {
    private String planId;
    private String payMethod;
    private BigDecimal amount;
}
