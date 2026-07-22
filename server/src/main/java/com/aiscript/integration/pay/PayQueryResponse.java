package com.aiscript.integration.pay;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PayQueryResponse {
    private String provider;
    private String orderNo;
    private String providerTradeNo;
    private String tradeStatus;
    private BigDecimal paidAmount;
    private boolean paid;
}
