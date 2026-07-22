package com.aiscript.modules.system.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.system.dto.HomeBannerDTO;
import com.aiscript.modules.system.entity.SysHomeBanner;
import com.aiscript.modules.system.mapper.SysHomeBannerMapper;
import com.aiscript.modules.system.service.HomeBannerService;
import com.aiscript.modules.system.vo.HomeBannerVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class HomeBannerServiceImpl implements HomeBannerService {
    private final SysHomeBannerMapper bannerMapper;
    private final StorageClient storageClient;

    public HomeBannerServiceImpl(SysHomeBannerMapper bannerMapper, StorageClient storageClient) {
        this.bannerMapper = bannerMapper;
        this.storageClient = storageClient;
    }

    @Override
    public List<HomeBannerVO> listEnabled() {
        return bannerMapper.selectList(baseQuery().eq(SysHomeBanner::getStatus, 1)).stream().map(this::toVO).toList();
    }

    @Override
    public List<HomeBannerVO> listAll() {
        return bannerMapper.selectList(baseQuery()).stream().map(this::toVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public HomeBannerVO save(Integer id, HomeBannerDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.title)) {
            throw new BusinessException("轮播标题不能为空");
        }
        SysHomeBanner banner = id == null ? new SysHomeBanner() : bannerMapper.selectById(id);
        if (banner == null) {
            throw new BusinessException("轮播项不存在");
        }
        banner.setTitle(dto.title.trim());
        banner.setSubtitle(dto.subtitle);
        banner.setImageUrl(dto.imageUrl);
        banner.setImageKey(dto.imageKey);
        banner.setLinkUrl(dto.linkUrl);
        banner.setSortOrder(dto.sortOrder == null ? 0 : dto.sortOrder);
        banner.setStatus(dto.status == null ? 1 : dto.status);
        if (id == null) bannerMapper.insert(banner); else bannerMapper.updateById(banner);
        return toVO(banner);
    }

    @Override
    public void delete(Integer id) {
        bannerMapper.deleteById(id);
    }

    private LambdaQueryWrapper<SysHomeBanner> baseQuery() {
        return new LambdaQueryWrapper<SysHomeBanner>()
            .orderByAsc(SysHomeBanner::getSortOrder)
            .orderByAsc(SysHomeBanner::getId);
    }

    private HomeBannerVO toVO(SysHomeBanner banner) {
        HomeBannerVO vo = new HomeBannerVO();
        vo.id = String.valueOf(banner.getId());
        vo.title = banner.getTitle();
        vo.subtitle = banner.getSubtitle();
        vo.imageUrl = StringUtils.hasText(banner.getImageKey())
            ? storageClient.presignedUrl(banner.getImageKey())
            : banner.getImageUrl();
        vo.imageKey = banner.getImageKey();
        vo.linkUrl = banner.getLinkUrl();
        vo.sortOrder = banner.getSortOrder();
        vo.status = banner.getStatus();
        vo.createdAt = banner.getCreateTime() == null ? null : banner.getCreateTime().toString();
        vo.updatedAt = banner.getUpdateTime() == null ? null : banner.getUpdateTime().toString();
        return vo;
    }
}
