package com.aiscript.integration.pay;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PayCreateResponse {
    private String provider;
    private String orderNo;
    private String providerTradeNo;
    private String subject;
    private String payUrl;
    private String qrContent;
    private String formHtml;
    private BigDecimal amount;
    private String rawPayload;
}
