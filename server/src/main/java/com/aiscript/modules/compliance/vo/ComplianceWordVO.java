package com.aiscript.modules.compliance.vo;

import lombok.Data;

@Data
public class ComplianceWordVO {
    private String id;
    private String wordText;
    private String category;
    private String riskLevel;
    private String suggestion;
}
