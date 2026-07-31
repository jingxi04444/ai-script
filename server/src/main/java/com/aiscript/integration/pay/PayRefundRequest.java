package com.aiscript.integration.pay;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PayRefundRequest {
    private String orderNo;
    private String providerTradeNo;
    private String refundNo;
    private BigDecimal refundAmount;
    private BigDecimal totalAmount;
    private String reason;
}