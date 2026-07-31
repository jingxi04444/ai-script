package com.aiscript.modules.payment.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.EqualsAndHashCode;

@TableName("ai_payment_order")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiPaymentOrder extends TenantBaseEntity {
    private Integer userId;
    private String orderNo;
    private String idempotencyKey;
    private String orderType;
    private String orderScene;
    private String payMethod;
    private String provider;
    private String tradeType;
    private Integer planId;
    private Long skuId;
    private Long subscriptionId;
    private String productSnapshotJson;
    private String currency;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private BigDecimal refundAmount;
    private String subject;
    private String status;
    private String providerStatus;
    private String providerTradeNo;
    private String qrContent;
    private LocalDateTime payTime;
    private LocalDateTime expireTime;
    private LocalDateTime notifyTime;
    private LocalDateTime lastQueryTime;
    private String fulfillStatus;
    private LocalDateTime fulfillTime;
    private String fulfillError;
    private LocalDateTime closeTime;
    private Integer version;
}
