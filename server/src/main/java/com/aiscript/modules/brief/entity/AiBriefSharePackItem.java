package com.aiscript.modules.brief.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@TableName("ai_brief_share_pack_item")
public class AiBriefSharePackItem extends TenantBaseEntity {
    private Integer sharePackId;
    private Integer briefId;
}
