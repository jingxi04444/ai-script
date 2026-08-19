package com.aiscript.modules.script.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_script_review_link")
public class AiScriptReviewLink extends TenantBaseEntity {
    private Integer scriptId;
    private String tokenHash;
    private String versionScope;
    private Integer fixedVersionId;
    private String status;
    private LocalDateTime expiresAt;
    private Integer maxUses;
    private Integer usedCount;
}
