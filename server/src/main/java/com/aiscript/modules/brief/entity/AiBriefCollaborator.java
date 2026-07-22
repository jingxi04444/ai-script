package com.aiscript.modules.brief.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@TableName("ai_brief_collaborator")
public class AiBriefCollaborator extends TenantBaseEntity {
    private Integer briefId;
    private Integer userId;
    private String permission;
    private Integer status;
}
