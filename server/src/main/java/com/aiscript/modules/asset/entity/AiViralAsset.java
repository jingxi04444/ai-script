package com.aiscript.modules.asset.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_viral_asset")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiViralAsset extends TenantBaseEntity {
    private String assetName;
    private String assetKind;
    private String sourceType;
    private String platform;
    private String sourceUrl;
    private String scriptText;
    private String structureFormula;
    private String shotReport;
    private String tagsJson;
    private String storageKey;
    private Integer usageCount;
    private Integer status;
}
