package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_benefit_usage_transaction")
public class AiBenefitUsageTransaction {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long usageId;
    private Long userId;
    private String benefitCode;
    private String requestNo;
    private Long amount;
    private String status;
    private String bizType;
    private Long bizId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}