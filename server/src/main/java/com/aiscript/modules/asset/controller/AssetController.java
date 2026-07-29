package com.aiscript.modules.asset.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.asset.dto.AssetSaveDTO;
import com.aiscript.modules.asset.dto.SellingPointAssetSaveDTO;
import com.aiscript.modules.asset.dto.ViralAssetSaveDTO;
import com.aiscript.modules.asset.service.AssetService;
import com.aiscript.modules.asset.vo.AssetVO;
import com.aiscript.modules.asset.vo.SellingPointAssetVO;
import com.aiscript.modules.asset.vo.ViralAssetVO;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class AssetController {
    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping("/assets")
    public R<PageResult<AssetVO>> assets(PageQuery query, @RequestParam(required = false) String projectId, @RequestParam(required = false) String type) {
        return R.ok(assetService.assetPage(query, projectId, type));
    }

    @PostMapping("/assets")
    public R<AssetVO> createAsset(@RequestBody AssetSaveDTO dto) {
        return R.ok(assetService.saveAsset(null, dto));
    }

    @PostMapping("/product-frame-assets/upload")
    public R<AssetVO> uploadProductFrame(
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false) String projectId
    ) {
        return R.ok(assetService.uploadProductFrame(file, projectId));
    }

    @PutMapping("/assets/{id}")
    public R<AssetVO> updateAsset(@PathVariable Integer id, @RequestBody AssetSaveDTO dto) {
        return R.ok(assetService.saveAsset(id, dto));
    }

    @DeleteMapping("/assets/{id}")
    public R<Void> deleteAsset(@PathVariable Integer id) {
        assetService.deleteAsset(id);
        return R.ok();
    }

    @GetMapping("/selling-point-assets")
    public R<PageResult<SellingPointAssetVO>> sellingPointAssets(PageQuery query) {
        return R.ok(assetService.sellingPointPage(query));
    }

    @PostMapping("/selling-point-assets")
    public R<SellingPointAssetVO> createSellingPoint(@RequestBody SellingPointAssetSaveDTO dto) {
        return R.ok(assetService.saveSellingPoint(null, dto));
    }

    @PutMapping("/selling-point-assets/{id}")
    public R<SellingPointAssetVO> updateSellingPoint(@PathVariable Integer id, @RequestBody SellingPointAssetSaveDTO dto) {
        return R.ok(assetService.saveSellingPoint(id, dto));
    }

    @DeleteMapping("/selling-point-assets/{id}")
    public R<Void> deleteSellingPoint(@PathVariable Integer id) {
        assetService.deleteSellingPoint(id);
        return R.ok();
    }

    @GetMapping("/viral-assets")
    public R<PageResult<ViralAssetVO>> viralAssets(PageQuery query, @RequestParam(required = false) String kind) {
        return R.ok(assetService.viralPage(query, kind));
    }

    @PostMapping("/viral-assets")
    public R<ViralAssetVO> createViral(@RequestBody ViralAssetSaveDTO dto) {
        return R.ok(assetService.saveViral(null, dto));
    }

    @PutMapping("/viral-assets/{id}")
    public R<ViralAssetVO> updateViral(@PathVariable Integer id, @RequestBody ViralAssetSaveDTO dto) {
        return R.ok(assetService.saveViral(id, dto));
    }

    @DeleteMapping("/viral-assets/{id}")
    public R<Void> deleteViral(@PathVariable Integer id) {
        assetService.deleteViral(id);
        return R.ok();
    }
}
