package com.aiscript.modules.asset.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_selling_point_asset")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiSellingPointAsset extends TenantBaseEntity {
    private String assetName;
    private String sourceType;
    private String tagText;
    private String mainPoint;
    private String targetAudience;
    private Integer usageCount;
    private Integer status;
}
