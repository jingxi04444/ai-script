package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_membership_plan_sku")
public class AiMembershipPlanSku {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long planId;
    private String skuCode;
    private String skuName;
    private String billingMode;
    private String periodUnit;
    private Integer periodCount;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer refundDays;
    private Integer status;
    private Integer displayOrder;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}