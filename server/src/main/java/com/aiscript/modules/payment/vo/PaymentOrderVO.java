package com.aiscript.modules.payment.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentOrderVO {
    private String id;
    private String userId;
    private String orderNo;
    private String orderType;
    private String status;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private String currency;
    private String payMethod;
    private String subject;
    private String providerTradeNo;
    private String provider;
    private String providerStatus;
    private String fulfillStatus;
    private String qrContent;
    private String expireTime;
    private String payTime;
    private String createdAt;
    private String updatedAt;
    private String lastQueryTime;
    private String fulfillTime;
    private String fulfillError;
    private PaymentParamsVO payParams;
}
