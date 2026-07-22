package com.aiscript.modules.admin.vo;

import lombok.Data;

@Data
public class DashboardSummaryVO {
    private Long userCount;
    private Long projectCount;
    private Long scriptCount;
    private Long videoCount;
}
