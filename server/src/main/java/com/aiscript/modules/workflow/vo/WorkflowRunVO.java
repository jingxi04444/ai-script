package com.aiscript.modules.workflow.vo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class WorkflowRunVO {
    private String id;
    private String projectId;
    private String workflowId;
    private Integer workflowVersion;
    private String status;
    private Integer progress;
    private Integer totalNodes;
    private Integer completedNodes;
    private Integer failedNodes;
    private boolean cancelRequested;
    private String outputJson;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private List<WorkflowNodeRunVO> nodes = new ArrayList<>();
}
