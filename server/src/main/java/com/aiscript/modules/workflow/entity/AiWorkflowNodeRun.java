package com.aiscript.modules.workflow.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_workflow_node_run")
public class AiWorkflowNodeRun extends LongTenantBaseEntity {
    private Long workflowRunId;
    private String nodeId;
    private String nodeKind;
    private String skillCode;
    private String skillVersion;
    private String status;
    private Integer attempt;
    private Integer progress;
    private String inputJson;
    private String configJson;
    private String outputJson;
    private String workerId;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}
