package com.aiscript.modules.recyclebin.vo;

import lombok.Data;

@Data
public class RecycleBinItemVO {
    private String id;
    private String resourceType;
    private String resourceId;
    private String resourceName;
    private String parentId;
    private Integer retentionDays;
    private Long remainingDays;
    private String deletedAt;
    private String expireAt;
}
