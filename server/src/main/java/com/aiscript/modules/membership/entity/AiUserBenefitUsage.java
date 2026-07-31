package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_user_benefit_usage")
public class AiUserBenefitUsage {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long cycleId;
    private Long userId;
    private String benefitCode;
    private String usageScope;
    private String scopeKey;
    private Long quotaTotal;
    private Long usedAmount;
    private Long reservedAmount;
    private Integer version;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}