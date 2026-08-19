package com.aiscript.modules.script.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_script_review_access")
public class AiScriptReviewAccess extends TenantBaseEntity {
    private Integer reviewLinkId;
    private Integer scriptId;
    private Integer userId;
    private String status;
    private LocalDateTime lastAccessTime;
}
