package com.aiscript.modules.payment.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentParamsVO {
    private String providerTradeNo;
    private String orderNo;
    private BigDecimal amount;
    private String subject;
    private String payUrl;
    private String qrCode;
    private String rawPayload;
}
