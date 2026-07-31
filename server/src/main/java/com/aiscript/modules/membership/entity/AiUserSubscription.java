package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_user_subscription")
public class AiUserSubscription {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long userId;
    private Long planId;
    private Long skuId;
    private String status;
    private Integer autoRenew;
    private LocalDateTime startTime;
    private LocalDateTime currentPeriodStart;
    private LocalDateTime currentPeriodEnd;
    private LocalDateTime benefitAnchorTime;
    private LocalDateTime nextRenewTime;
    private Integer cancelAtPeriodEnd;
    private LocalDateTime cancelTime;
    private Long pendingPlanId;
    private Long pendingSkuId;
    private LocalDateTime pendingEffectiveTime;
    private String provider;
    private String agreementNo;
    private String planSnapshotJson;
    private String sourceOrderNo;
    private Integer version;
    @TableField(insertStrategy = FieldStrategy.NEVER, updateStrategy = FieldStrategy.NEVER)
    private Integer activeSlot;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}