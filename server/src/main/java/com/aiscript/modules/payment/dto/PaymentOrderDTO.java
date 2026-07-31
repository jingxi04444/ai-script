package com.aiscript.modules.payment.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PaymentOrderDTO {
    private String planId;
    private String skuId;
    private String payMethod;
    private BigDecimal amount;
    private String idempotencyKey;
}