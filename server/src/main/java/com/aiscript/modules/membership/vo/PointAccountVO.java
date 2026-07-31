package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class PointAccountVO {
    private String id;
    private String userId;
    private Long availablePoints;
    private Long frozenPoints;
    private String updatedAt;
}