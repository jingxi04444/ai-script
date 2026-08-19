package com.aiscript.modules.project.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_project")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiProject extends TenantBaseEntity {
    private Integer ownerId;
    private String projectName;
    private String avatarUrl;
    private String announcement;
    private String category;
    private String productName;
    private String platform;
    private String videoRatio;
    private String videoType;
    private String status;
    private String currentStep;
    private Integer progress;
    private Integer briefCount;
    private Integer scriptCount;
    private Integer videoCount;
}
