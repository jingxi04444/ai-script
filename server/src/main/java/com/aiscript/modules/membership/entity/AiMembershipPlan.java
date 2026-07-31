package com.aiscript.modules.membership.entity;

import lombok.Data;

import com.aiscript.common.model.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.EqualsAndHashCode;

@TableName("ai_membership_plan")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiMembershipPlan extends BaseEntity {
    private String planCode;
    private String planName;
    private Integer planLevel;
    private Integer isFree;
    private Integer periodDays;
    private BigDecimal price;
    private String benefitsJson;
    private String description;
    private Integer displayOrder;
    private Integer status;
}
