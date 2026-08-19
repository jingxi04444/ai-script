package com.aiscript.modules.recyclebin.vo;

import lombok.Data;

@Data
public class RecycleBinSummaryVO {
    private Long total;
    private Long projectCount;
    private Long briefCount;
    private Long scriptCount;
    private Integer retentionDays;
}
