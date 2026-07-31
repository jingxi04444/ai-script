package com.aiscript.modules.payment.vo;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class RefundOrderVO {
    private String id;
    private String refundNo;
    private String paymentOrderId;
    private String paymentOrderNo;
    private String subscriptionId;
    private String userId;
    private BigDecimal refundAmount;
    private String refundReason;
    private String provider;
    private String providerRefundNo;
    private String providerStatus;
    private String status;
    private String reviewBy;
    private String reviewTime;
    private String reviewRemark;
    private String requestedTime;
    private String completedTime;
    private String failureReason;
}