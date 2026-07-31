package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_membership_benefit_cycle")
public class AiMembershipBenefitCycle {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long subscriptionId;
    private Long userId;
    private Long planId;
    private Integer cycleNo;
    private LocalDateTime cycleStart;
    private LocalDateTime cycleEnd;
    private String status;
    private String benefitSnapshotJson;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}