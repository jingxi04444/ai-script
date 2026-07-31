package com.aiscript.modules.payment.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_refund_order")
public class AiRefundOrder {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private String refundNo;
    private Long paymentOrderId;
    private Long subscriptionId;
    private Long userId;
    private BigDecimal refundAmount;
    private String refundReason;
    private String provider;
    private String providerRefundNo;
    private String providerStatus;
    private String status;
    private Long reviewBy;
    private LocalDateTime reviewTime;
    private String reviewRemark;
    private LocalDateTime requestedTime;
    private LocalDateTime completedTime;
    private String failureReason;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}