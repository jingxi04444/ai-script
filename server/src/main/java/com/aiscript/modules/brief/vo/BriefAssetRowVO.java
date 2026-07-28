package com.aiscript.modules.brief.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BriefAssetRowVO {
    private Integer projectId;
    private String projectName;
    private Integer briefId;
    private String name;
    private String productName;
    private String productModel;
    private LocalDateTime updatedAt;
}
