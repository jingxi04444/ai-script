package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_subscription_change_record")
public class AiSubscriptionChangeRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long subscriptionId;
    private Long userId;
    private String changeType;
    private Long beforePlanId;
    private Long beforeSkuId;
    private Long afterPlanId;
    private Long afterSkuId;
    private BigDecimal originalAmount;
    private BigDecimal creditAmount;
    private BigDecimal payableAmount;
    private String effectiveType;
    private LocalDateTime effectiveTime;
    private String sourceOrderNo;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}