package com.aiscript.modules.workflow.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class WorkflowVO {
    private String id;
    private String projectId;
    private String name;
    private String mode;
    private Integer version;
    private String graphJson;
    private LocalDateTime updatedAt;
}
