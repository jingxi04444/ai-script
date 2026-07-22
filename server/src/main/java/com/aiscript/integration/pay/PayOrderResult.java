package com.aiscript.integration.pay;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PayOrderResult {
    private String providerTradeNo;
    private String orderNo;
    private BigDecimal amount;
    private String subject;
    private String payUrl;
    private String qrCode;
    private String rawPayload;
}
