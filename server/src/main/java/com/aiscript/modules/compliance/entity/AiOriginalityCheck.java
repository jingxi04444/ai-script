package com.aiscript.modules.compliance.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("ai_originality_check")
@Data
public class AiOriginalityCheck {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer scriptVersionId;
    private BigDecimal similarityPercent;
    private String matchedSources;
    private String suggestion;
    private LocalDateTime checkTime;
}
