package com.aiscript.modules.brief.vo;

import java.util.List;

public class BriefDetectionReportVO {
    public String id;
    public String briefId;
    public String briefName;
    public Integer totalScore;
    public Integer maxScore;
    public Integer totalMaxScore;
    public String grade;
    public String level;
    public String levelText;
    public String summary;
    public String evaluatedAt;
    public List<BriefDetectionMetricVO> metrics;
    public List<String> seriousRisks;
    public List<String> severeRisks;
    public String riskSummary;
    public List<BriefDetectionSuggestionVO> suggestions;
    public String reconstructedExample;
    public String optimizedExample;
    public String createdAt;
}
