package com.aiscript.modules.storyboard.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.EqualsAndHashCode;

@TableName("ai_storyboard_shot")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiStoryboardShot extends TenantBaseEntity {
    private Integer scriptVersionId;
    private Integer shotNo;
    private String shotType;
    private String sceneDescription;
    private String lineText;
    private BigDecimal durationSeconds;
    private String sellingPointNote;
    private String riskLevel;
    private Integer sortOrder;
}
