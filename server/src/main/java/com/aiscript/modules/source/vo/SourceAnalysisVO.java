package com.aiscript.modules.source.vo;

import lombok.Data;
import java.util.List;

@Data
public class SourceAnalysisVO {
    private String id;
    private String projectId;
    private String mode;
    private String sourceUrl;
    private String platform;
    private String title;
    private String authorName;
    private String coverUrl;
    private String videoUrl;
    private String editableCopy;
    private String structureSummary;
    private List<AnalysisDimensionVO> dimensions;
    private String status;
}
