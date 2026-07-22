package com.aiscript.modules.source.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_source_analysis")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiSourceAnalysis extends TenantBaseEntity {
    private Integer projectId;
    private String mode;
    private String sourceUrl;
    private String platform;
    private String title;
    private String authorName;
    private String coverUrl;
    private String videoUrl;
    private String metricsJson;
    private String editableCopy;
    private String structureSummary;
    private String status;
}
