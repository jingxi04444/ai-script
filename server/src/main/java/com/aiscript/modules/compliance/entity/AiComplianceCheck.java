package com.aiscript.modules.compliance.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_compliance_check")
@Data
public class AiComplianceCheck {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer scriptVersionId;
    private String status;
    private Integer riskCount;
    private String resultJson;
    private LocalDateTime checkTime;
}
