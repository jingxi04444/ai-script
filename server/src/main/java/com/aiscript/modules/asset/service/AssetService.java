package com.aiscript.modules.asset.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.asset.dto.AssetSaveDTO;
import com.aiscript.modules.asset.dto.SellingPointAssetSaveDTO;
import com.aiscript.modules.asset.dto.ViralAssetSaveDTO;
import com.aiscript.modules.asset.vo.AssetVO;
import com.aiscript.modules.asset.vo.SellingPointAssetVO;
import com.aiscript.modules.asset.vo.ViralAssetVO;
import org.springframework.web.multipart.MultipartFile;

public interface AssetService {
    PageResult<AssetVO> assetPage(PageQuery query, String projectId, String type);

    AssetVO saveAsset(Integer id, AssetSaveDTO dto);

    AssetVO uploadProductFrame(MultipartFile file, String projectId);

    void deleteAsset(Integer id);

    PageResult<SellingPointAssetVO> sellingPointPage(PageQuery query);

    SellingPointAssetVO saveSellingPoint(Integer id, SellingPointAssetSaveDTO dto);

    void deleteSellingPoint(Integer id);

    PageResult<ViralAssetVO> viralPage(PageQuery query, String kind);

    ViralAssetVO saveViral(Integer id, ViralAssetSaveDTO dto);

    void deleteViral(Integer id);
}
