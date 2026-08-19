package com.aiscript.modules.project.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_project_collaborator")
public class AiProjectCollaborator extends TenantBaseEntity {
    private Integer projectId;
    private Integer userId;
    private Integer joinedLinkId;
    private String status;
    private LocalDateTime joinedAt;
}
