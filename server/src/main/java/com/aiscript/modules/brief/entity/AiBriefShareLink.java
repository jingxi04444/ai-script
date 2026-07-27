package com.aiscript.modules.brief.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@TableName("ai_brief_share_link")
public class AiBriefShareLink extends TenantBaseEntity {
    private Integer briefId;
    private String shareToken;
    private String permission;
    private Integer enabled;
}
