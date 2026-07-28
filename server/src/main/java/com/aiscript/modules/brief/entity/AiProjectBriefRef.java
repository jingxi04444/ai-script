package com.aiscript.modules.brief.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@TableName("ai_project_brief_ref")
public class AiProjectBriefRef extends TenantBaseEntity {
    private Integer projectId;
    private Integer briefId;
}