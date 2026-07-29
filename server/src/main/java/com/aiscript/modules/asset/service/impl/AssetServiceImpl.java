package com.aiscript.modules.asset.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.asset.convert.AssetConvert;
import com.aiscript.modules.asset.dto.AssetSaveDTO;
import com.aiscript.modules.asset.dto.SellingPointAssetSaveDTO;
import com.aiscript.modules.asset.dto.ViralAssetSaveDTO;
import com.aiscript.modules.asset.entity.AiAsset;
import com.aiscript.modules.asset.entity.AiSellingPointAsset;
import com.aiscript.modules.asset.entity.AiViralAsset;
import com.aiscript.modules.asset.mapper.AiAssetMapper;
import com.aiscript.modules.asset.mapper.AiSellingPointAssetMapper;
import com.aiscript.modules.asset.mapper.AiViralAssetMapper;
import com.aiscript.modules.asset.service.AssetService;
import com.aiscript.modules.asset.service.ProductFrameContentExtractor;
import com.aiscript.modules.asset.vo.AssetVO;
import com.aiscript.modules.asset.vo.SellingPointAssetVO;
import com.aiscript.modules.asset.vo.ViralAssetVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AssetServiceImpl implements AssetService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private static final String IMMUTABLE_FILE_CATEGORY = "product-frame-library";
    private final AiAssetMapper assetMapper;
    private final AiSellingPointAssetMapper sellingPointAssetMapper;
    private final AiViralAssetMapper viralAssetMapper;
    private final StorageClient storageClient;
    private final ProductFrameContentExtractor productFrameContentExtractor;

    public AssetServiceImpl(
        AiAssetMapper assetMapper,
        AiSellingPointAssetMapper sellingPointAssetMapper,
        AiViralAssetMapper viralAssetMapper,
        StorageClient storageClient,
        ProductFrameContentExtractor productFrameContentExtractor
    ) {
        this.assetMapper = assetMapper;
        this.sellingPointAssetMapper = sellingPointAssetMapper;
        this.viralAssetMapper = viralAssetMapper;
        this.storageClient = storageClient;
        this.productFrameContentExtractor = productFrameContentExtractor;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetVO uploadProductFrame(MultipartFile file, String projectId) {
        if (file == null || file.isEmpty() || !StringUtils.hasText(file.getOriginalFilename())) {
            throw new BusinessException("请选择需要上传的产品画面文件");
        }
        Integer parsedProjectId = StringUtils.hasText(projectId) ? parseProjectId(projectId) : null;
        String filename = file.getOriginalFilename().trim();
        String extractedText = productFrameContentExtractor.extract(file);
        String suffix = filename.contains(".") ? filename.substring(filename.lastIndexOf(".")) : "";
        String objectKey = "product-frame/" + LocalDate.now() + "/"
            + UUID.randomUUID().toString().replace("-", "") + suffix;
        try {
            objectKey = storageClient.putObject(objectKey, file.getInputStream(), file.getSize(), file.getContentType());
        } catch (IOException ex) {
            throw new BusinessException("产品画面文件读取失败：" + ex.getMessage());
        }

        AiAsset entity = assetMapper.selectOne(new LambdaQueryWrapper<AiAsset>()
            .eq(AiAsset::getTenantId, currentTenantId())
            .eq(AiAsset::getOwnerId, currentUserId())
            .eq(AiAsset::getCategory, IMMUTABLE_FILE_CATEGORY)
            .eq(AiAsset::getAssetName, filename)
            .orderByDesc(AiAsset::getUpdateTime)
            .last("LIMIT 1"));
        boolean created = entity == null;
        if (created) {
            entity = new AiAsset();
            entity.setTenantId(currentTenantId());
            entity.setOwnerId(currentUserId());
            entity.setUsageCount(0);
            entity.setStatus(1);
            entity.setSource("upload");
        }
        entity.setProjectId(parsedProjectId);
        entity.setAssetName(filename);
        entity.setAssetType(productFrameContentExtractor.isTableFile(filename) ? "document" : "image");
        entity.setCategory(IMMUTABLE_FILE_CATEGORY);
        entity.setStorageKey(objectKey);
        entity.setPreviewUrl(storageClient.presignedUrl(objectKey));
        entity.setMimeType(file.getContentType());
        entity.setFileSizeBytes(file.getSize());
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("extractedText", StringUtils.hasText(extractedText) ? extractedText : "");
        metadata.put("immutable", true);
        metadata.put("source", "script-product-frame");
        metadata.put("parseType", productFrameContentExtractor.isTableFile(filename) ? "table" : "ocr");
        entity.setMetadataJson(JsonUtils.toJson(metadata));
        if (created) {
            assetMapper.insert(entity);
        } else {
            assetMapper.updateById(entity);
        }
        AssetVO result = AssetConvert.toAssetVO(entity);
        result.setExtractedText(extractedText);
        result.setUpdatedExisting(!created);
        return result;
    }

    @Override
    public PageResult<AssetVO> assetPage(PageQuery query, String projectId, String type) {
        LambdaQueryWrapper<AiAsset> wrapper = new LambdaQueryWrapper<AiAsset>()
            .eq(AiAsset::getTenantId, currentTenantId())
            .eq(AiAsset::getOwnerId, currentUserId());
        if (StringUtils.hasText(projectId)) {
            wrapper.eq(AiAsset::getProjectId, Integer.valueOf(projectId));
        }
        if (StringUtils.hasText(type)) {
            wrapper.eq(AiAsset::getAssetType, type);
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(AiAsset::getAssetName, query.getKeyword());
        }
        wrapper.orderByDesc(AiAsset::getCreateTime);
        IPage<AiAsset> page = assetMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<AssetVO> list = page.getRecords().stream().map(AssetConvert::toAssetVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AssetVO saveAsset(Integer id, AssetSaveDTO dto) {
        AiAsset entity = id == null ? new AiAsset() : ownedAsset(id);
        if (entity == null) {
            throw new BusinessException("素材不存在");
        }
        if (id == null) {
            entity.setTenantId(currentTenantId());
            entity.setOwnerId(currentUserId());
            entity.setUsageCount(0);
            entity.setStatus(1);
            entity.setSource("upload");
        } else if (IMMUTABLE_FILE_CATEGORY.equals(entity.getCategory())) {
            throw new BusinessException("文件库中的通用画面为原始资产，不支持修改");
        }
        entity.setProjectId(StringUtils.hasText(dto.getProjectId()) ? Integer.valueOf(dto.getProjectId()) : null);
        entity.setAssetName(dto.getName());
        entity.setAssetType(StringUtils.hasText(dto.getType()) ? dto.getType() : "file");
        entity.setCategory(dto.getCategory());
        entity.setStorageKey(dto.getStorageKey());
        entity.setPreviewUrl(dto.getPreviewUrl());
        entity.setMimeType(dto.getMimeType());
        entity.setFileSizeBytes(dto.getFileSizeBytes());
        entity.setMetadataJson(dto.getMetadataJson());
        if (id == null) {
            assetMapper.insert(entity);
        } else {
            assetMapper.updateById(entity);
        }
        return AssetConvert.toAssetVO(entity);
    }

    @Override
    public void deleteAsset(Integer id) {
        AiAsset entity = ownedAsset(id);
        if (IMMUTABLE_FILE_CATEGORY.equals(entity.getCategory())) {
            throw new BusinessException("文件库中的通用画面为原始资产，不支持删除");
        }
        assetMapper.deleteById(entity.getId());
    }

    @Override
    public PageResult<SellingPointAssetVO> sellingPointPage(PageQuery query) {
        LambdaQueryWrapper<AiSellingPointAsset> wrapper = new LambdaQueryWrapper<AiSellingPointAsset>()
            .eq(AiSellingPointAsset::getTenantId, currentTenantId())
            .eq(AiSellingPointAsset::getCreateBy, currentUserId());
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(AiSellingPointAsset::getAssetName, query.getKeyword());
        }
        wrapper.orderByDesc(AiSellingPointAsset::getCreateTime);
        IPage<AiSellingPointAsset> page = sellingPointAssetMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<SellingPointAssetVO> list = page.getRecords().stream().map(AssetConvert::toSellingPointVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SellingPointAssetVO saveSellingPoint(Integer id, SellingPointAssetSaveDTO dto) {
        AiSellingPointAsset entity = id == null ? new AiSellingPointAsset() : ownedSellingPoint(id);
        if (entity == null) {
            throw new BusinessException("卖点资产不存在");
        }
        if (id == null) {
            entity.setTenantId(currentTenantId());
            entity.setSourceType("manual");
            entity.setUsageCount(0);
            entity.setStatus(1);
        }
        entity.setAssetName(dto.getName());
        entity.setTagText(dto.getTagText());
        entity.setMainPoint(dto.getMainPoint());
        entity.setTargetAudience(dto.getTargetAudience());
        if (id == null) {
            sellingPointAssetMapper.insert(entity);
        } else {
            sellingPointAssetMapper.updateById(entity);
        }
        return AssetConvert.toSellingPointVO(entity);
    }

    @Override
    public void deleteSellingPoint(Integer id) {
        sellingPointAssetMapper.deleteById(ownedSellingPoint(id).getId());
    }

    @Override
    public PageResult<ViralAssetVO> viralPage(PageQuery query, String kind) {
        LambdaQueryWrapper<AiViralAsset> wrapper = new LambdaQueryWrapper<AiViralAsset>()
            .eq(AiViralAsset::getTenantId, currentTenantId())
            .eq(AiViralAsset::getCreateBy, currentUserId());
        if (StringUtils.hasText(kind)) {
            wrapper.eq(AiViralAsset::getAssetKind, kind);
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(AiViralAsset::getAssetName, query.getKeyword());
        }
        wrapper.orderByDesc(AiViralAsset::getCreateTime);
        IPage<AiViralAsset> page = viralAssetMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<ViralAssetVO> list = page.getRecords().stream().map(AssetConvert::toViralVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ViralAssetVO saveViral(Integer id, ViralAssetSaveDTO dto) {
        AiViralAsset entity = id == null ? new AiViralAsset() : ownedViral(id);
        if (entity == null) {
            throw new BusinessException("爆款资产不存在");
        }
        if (id == null) {
            entity.setTenantId(currentTenantId());
            entity.setSourceType("manual");
            entity.setUsageCount(0);
            entity.setStatus(1);
        }
        entity.setAssetName(dto.getName());
        entity.setAssetKind(StringUtils.hasText(dto.getKind()) ? dto.getKind() : "script");
        entity.setPlatform(dto.getPlatform());
        entity.setSourceUrl(dto.getSourceUrl());
        entity.setScriptText(dto.getScriptText());
        entity.setStructureFormula(dto.getStructureFormula());
        entity.setTagsJson(dto.getTagsJson());
        if (id == null) {
            viralAssetMapper.insert(entity);
        } else {
            viralAssetMapper.updateById(entity);
        }
        return AssetConvert.toViralVO(entity);
    }

    @Override
    public void deleteViral(Integer id) {
        viralAssetMapper.deleteById(ownedViral(id).getId());
    }

    private AiAsset ownedAsset(Integer id) {
        AiAsset entity = assetMapper.selectOne(new LambdaQueryWrapper<AiAsset>()
            .eq(AiAsset::getId, id)
            .eq(AiAsset::getTenantId, currentTenantId())
            .eq(AiAsset::getOwnerId, currentUserId())
            .last("LIMIT 1"));
        if (entity == null) {
            throw new BusinessException("素材不存在或无权操作");
        }
        return entity;
    }

    private AiSellingPointAsset ownedSellingPoint(Integer id) {
        AiSellingPointAsset entity = sellingPointAssetMapper.selectOne(new LambdaQueryWrapper<AiSellingPointAsset>()
            .eq(AiSellingPointAsset::getId, id)
            .eq(AiSellingPointAsset::getTenantId, currentTenantId())
            .eq(AiSellingPointAsset::getCreateBy, currentUserId())
            .last("LIMIT 1"));
        if (entity == null) {
            throw new BusinessException("卖点资产不存在或无权操作");
        }
        return entity;
    }

    private AiViralAsset ownedViral(Integer id) {
        AiViralAsset entity = viralAssetMapper.selectOne(new LambdaQueryWrapper<AiViralAsset>()
            .eq(AiViralAsset::getId, id)
            .eq(AiViralAsset::getTenantId, currentTenantId())
            .eq(AiViralAsset::getCreateBy, currentUserId())
            .last("LIMIT 1"));
        if (entity == null) {
            throw new BusinessException("爆款资产不存在或无权操作");
        }
        return entity;
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer parseProjectId(String projectId) {
        try {
            return Integer.valueOf(projectId);
        } catch (NumberFormatException ex) {
            throw new BusinessException("项目参数错误");
        }
    }

    private Integer currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException("请先登录");
        }
        return loginUser.getUserId();
    }
}
