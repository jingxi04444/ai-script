package com.aiscript.modules.asset.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.EqualsAndHashCode;

@TableName("ai_asset")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiAsset extends TenantBaseEntity {
    private Integer projectId;
    private Integer ownerId;
    private String assetName;
    private String assetType;
    private String category;
    private String storageKey;
    private String previewUrl;
    private String mimeType;
    private Long fileSizeBytes;
    private BigDecimal durationSeconds;
    private Integer width;
    private Integer height;
    private String source;
    private Integer usageCount;
    private String metadataJson;
    private Integer status;
}
