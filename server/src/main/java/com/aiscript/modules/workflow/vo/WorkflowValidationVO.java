package com.aiscript.modules.workflow.vo;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class WorkflowValidationVO {
    private boolean valid;
    private Integer nodeCount;
    private Integer edgeCount;
    private Integer estimatedShotCount;
    private Integer estimatedVideoCount;
    private List<String> errors = new ArrayList<>();
}
