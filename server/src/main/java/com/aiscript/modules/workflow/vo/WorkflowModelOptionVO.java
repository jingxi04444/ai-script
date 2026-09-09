package com.aiscript.modules.workflow.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WorkflowModelOptionVO {
    private String providerId;
    private String providerType;
    private String providerName;
    private String platform;
    private String model;
}
