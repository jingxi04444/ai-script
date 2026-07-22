package com.aiscript.modules.brief.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@TableName("ai_brief")
public class AiBrief extends TenantBaseEntity {
    private Integer projectId;
    private String briefName;
    private String productName;
    private String productModel;
    private String price;
    private String slogan;
    private String primarySellingPoint;
    private String targetAudience;
    private String targetScene;
    private String otherRequirements;
    private String briefContent;
    private Integer versionNo;
    private String status;
    private Integer isShared;
    private Integer shareEnabled;
    private String shareToken;
    private java.time.LocalDateTime shareTime;
}
