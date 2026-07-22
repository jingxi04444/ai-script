package com.aiscript.modules.auditflow.vo;

import lombok.Data;

@Data
public class AuditTaskVO {
    private String id;
    private String projectId;
    private String scriptId;
    private String currentVersionId;
    private String status;
    private String stage;
    private String assigneeId;
    private String riskSummary;
}
