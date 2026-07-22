package com.aiscript.modules.brief.vo;

public class BriefDetectionMetricVO {
    public String key;
    public String label;
    public Integer score;
    public Integer maxScore;
    public String tone;
    public String level;

    public BriefDetectionMetricVO() {
    }

    public BriefDetectionMetricVO(String key, String label, Integer score, Integer maxScore, String level) {
        this.key = key;
        this.label = label;
        this.score = score;
        this.maxScore = maxScore;
        this.tone = level;
        this.level = level;
    }
}
