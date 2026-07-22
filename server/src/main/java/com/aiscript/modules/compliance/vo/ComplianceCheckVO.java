package com.aiscript.modules.compliance.vo;

import lombok.Data;

import java.util.List;

@Data
public class ComplianceCheckVO {
    private String id;
    private String scriptVersionId;
    private Integer riskCount;
    private List<ComplianceRiskVO> risks;
    private String suggestion;
    private String similarityPercent;
    private List<OriginalityMatchVO> matchedSources;
}
