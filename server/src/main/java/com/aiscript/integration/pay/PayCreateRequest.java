package com.aiscript.integration.pay;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PayCreateRequest {
    private String provider;
    private String payMethod;
    private String orderNo;
    private BigDecimal amount;
    private String currency = "CNY";
    private String subject;
    private String description;
    private String notifyUrl;
    private String returnUrl;
    private String contractId;
}
