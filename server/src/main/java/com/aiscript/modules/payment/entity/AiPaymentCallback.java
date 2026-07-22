package com.aiscript.modules.payment.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_payment_callback")
@Data
public class AiPaymentCallback {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String provider;
    private String orderNo;
    private String notifyId;
    private String providerTradeNo;
    private String tradeStatus;
    private java.math.BigDecimal totalAmount;
    private String headersJson;
    private String rawBody;
    private String signature;
    private Boolean verified;
    private String errorMsg;
    private LocalDateTime receivedTime;
    private String payloadJson;
    private String handleResult;
    private LocalDateTime handleTime;
    private LocalDateTime createTime;
}
