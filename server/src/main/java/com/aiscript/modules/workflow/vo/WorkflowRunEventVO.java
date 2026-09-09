package com.aiscript.modules.workflow.vo;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class WorkflowRunEventVO {
    private String type;
    private String runId;
    private String nodeId;
    private String status;
    private Integer progress;
    private String message;
    private JsonNode output;
}
