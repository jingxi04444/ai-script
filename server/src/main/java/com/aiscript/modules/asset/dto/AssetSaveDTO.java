package com.aiscript.modules.asset.dto;

import lombok.Data;

@Data
public class AssetSaveDTO {
    private String projectId;
    private String name;
    private String type;
    private String category;
    private String storageKey;
    private String previewUrl;
    private String mimeType;
    private Long fileSizeBytes;
    private String metadataJson;
}
