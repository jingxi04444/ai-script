package com.aiscript.modules.workflow.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_workflow")
public class AiWorkflow extends LongTenantBaseEntity {
    private Integer projectId;
    private String name;
    private String mode;
    private Integer version;
    private String graphJson;
}
