package com.aiscript.modules.asset.vo;

import lombok.Data;

@Data
public class AssetVO {
    private String id;
    private String projectId;
    private String name;
    private String type;
    private String category;
    private String previewUrl;
    private String storageKey;
    private String status;
}
