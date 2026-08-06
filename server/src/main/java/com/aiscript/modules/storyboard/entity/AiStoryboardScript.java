package com.aiscript.modules.storyboard.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_storyboard_script")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiStoryboardScript extends TenantBaseEntity {
    private Integer projectId;
    private Integer briefId;
    private String briefSnapshot;
    private String scriptName;
    private String scriptType;
    private String generationDuration;
    private String generationFormat;
    private String generationFormatName;
    private String status;
    private String auditStatus;
    private Integer currentVersionId;
    private String shareToken;
    private String contentText;
}
