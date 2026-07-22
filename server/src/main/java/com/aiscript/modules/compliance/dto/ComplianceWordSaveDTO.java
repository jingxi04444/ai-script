package com.aiscript.modules.compliance.dto;

import lombok.Data;

@Data
public class ComplianceWordSaveDTO {
    private String wordText;
    private String category;
    private String riskLevel;
    private String suggestion;
}
