package com.aiscript.modules.compliance.vo;

import lombok.Data;

@Data
public class ComplianceRiskVO {
    private String word;
    private String category;
    private String riskLevel;
    private String suggestion;
}
