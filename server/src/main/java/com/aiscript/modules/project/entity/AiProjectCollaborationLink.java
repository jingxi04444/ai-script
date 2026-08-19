package com.aiscript.modules.project.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_project_collaboration_link")
public class AiProjectCollaborationLink extends TenantBaseEntity {
    private Integer projectId;
    private String tokenHash;
    private String status;
    private LocalDateTime expiresAt;
    private Integer maxUses;
    private Integer usedCount;
}
