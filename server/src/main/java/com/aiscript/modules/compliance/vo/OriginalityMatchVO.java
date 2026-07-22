package com.aiscript.modules.compliance.vo;

import lombok.Data;

@Data
public class OriginalityMatchVO {
    private String sourceType;
    private String sourceId;
    private String title;
    private String similarityPercent;
}
