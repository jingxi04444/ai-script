package com.aiscript.modules.workflow.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_scene_notice_plan")
public class AiSceneNoticePlan extends LongTenantBaseEntity {
    private Integer projectId;
    private Integer version;
    private String draftJson;
    private String planJson;
}
