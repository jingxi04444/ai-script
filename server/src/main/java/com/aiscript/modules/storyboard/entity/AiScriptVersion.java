package com.aiscript.modules.storyboard.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_script_version")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiScriptVersion extends TenantBaseEntity {
    private Integer scriptId;
    private Integer versionNo;
    private String versionTitle;
    private String contentSnapshot;
    private String changeNote;
}
