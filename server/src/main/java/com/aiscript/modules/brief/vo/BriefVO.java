package com.aiscript.modules.brief.vo;

import lombok.Data;

import java.util.List;

@Data
public class BriefVO {
    private String id;
    private String name;
    private String projectId;
    private List<BriefVersionVO> versions;
    private String updatedAt;
    private String productName;
    private String productModel;
    private String price;
    private String slogan;
    private String primarySellingPoint;
    private String targetAudience;
    private String targetScene;
    private String otherRequirements;
    private String briefContent;
    private String richContent;
    private Integer isShared;
    private Integer shareEnabled;
    private String shareToken;
    private String shareUrl;
    private String sharePermission;
    private String accessPermission;
    private Boolean ownedByCurrentUser;
}
