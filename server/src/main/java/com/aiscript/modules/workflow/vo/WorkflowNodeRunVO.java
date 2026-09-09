package com.aiscript.modules.workflow.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class WorkflowNodeRunVO {
    private String id;
    private String nodeId;
    private String nodeKind;
    private String skillCode;
    private String skillVersion;
    private String status;
    private Integer attempt;
    private Integer progress;
    private String outputJson;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}
