package com.aiscript.modules.asset.dto;

import lombok.Data;

@Data
public class ViralAssetSaveDTO {
    private String name;
    private String kind;
    private String platform;
    private String sourceUrl;
    private String scriptText;
    private String structureFormula;
    private String tagsJson;
}
