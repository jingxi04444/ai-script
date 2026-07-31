package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_membership_plan_benefit")
public class AiMembershipPlanBenefit {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long planId;
    private Long benefitId;
    private String benefitValue;
    private Integer enabled;
    private LocalDateTime effectiveTime;
    private LocalDateTime expireTime;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}