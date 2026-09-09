package com.aiscript.modules.workflow.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_workflow_run")
public class AiWorkflowRun extends LongTenantBaseEntity {
    private Integer projectId;
    private Long workflowId;
    private Integer workflowVersion;
    private String status;
    private Integer progress;
    private String graphJson;
    private String inputJson;
    private String outputJson;
    private Integer totalNodes;
    private Integer completedNodes;
    private Integer failedNodes;
    private Integer cancelRequested;
    private String idempotencyKey;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}
