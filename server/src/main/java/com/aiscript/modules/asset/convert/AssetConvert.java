package com.aiscript.modules.asset.convert;

import com.aiscript.modules.asset.entity.AiAsset;
import com.aiscript.modules.asset.entity.AiSellingPointAsset;
import com.aiscript.modules.asset.entity.AiViralAsset;
import com.aiscript.modules.asset.vo.AssetVO;
import com.aiscript.modules.asset.vo.SellingPointAssetVO;
import com.aiscript.modules.asset.vo.ViralAssetVO;

public final class AssetConvert {
    private AssetConvert() {
    }

    public static AssetVO toAssetVO(AiAsset entity) {
        AssetVO vo = new AssetVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setProjectId(entity.getProjectId() == null ? null : String.valueOf(entity.getProjectId()));
        vo.setName(entity.getAssetName());
        vo.setType(entity.getAssetType());
        vo.setCategory(entity.getCategory());
        vo.setPreviewUrl(entity.getPreviewUrl());
        vo.setStorageKey(entity.getStorageKey());
        vo.setMimeType(entity.getMimeType());
        vo.setFileSizeBytes(entity.getFileSizeBytes());
        vo.setMetadataJson(entity.getMetadataJson());
        vo.setStatus(entity.getStatus() != null && entity.getStatus() == 1 ? "enabled" : "disabled");
        return vo;
    }

    public static SellingPointAssetVO toSellingPointVO(AiSellingPointAsset entity) {
        SellingPointAssetVO vo = new SellingPointAssetVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setName(entity.getAssetName());
        vo.setTagText(entity.getTagText());
        vo.setMainPoint(entity.getMainPoint());
        vo.setTargetAudience(entity.getTargetAudience());
        return vo;
    }

    public static ViralAssetVO toViralVO(AiViralAsset entity) {
        ViralAssetVO vo = new ViralAssetVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setName(entity.getAssetName());
        vo.setKind(entity.getAssetKind());
        vo.setPlatform(entity.getPlatform());
        vo.setSourceUrl(entity.getSourceUrl());
        vo.setScriptText(entity.getScriptText());
        vo.setStructureFormula(entity.getStructureFormula());
        return vo;
    }
}
