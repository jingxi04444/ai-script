package com.aiscript.modules.workflow.vo;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WorkflowProviderExecuteVO {
    private String nodeKind;
    private Map<String, Object> output;
}
