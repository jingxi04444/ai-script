package com.aiscript.modules.market.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.market.entity.AiMarketViralFavorite;
import com.aiscript.modules.market.entity.AiMarketViralVideo;
import com.aiscript.modules.market.mapper.AiMarketViralFavoriteMapper;
import com.aiscript.modules.market.mapper.AiMarketViralVideoMapper;
import com.aiscript.modules.market.service.MarketViralFavoriteService;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketViralFavoriteServiceImpl implements MarketViralFavoriteService {
    private final AiMarketViralFavoriteMapper favoriteMapper;
    private final AiMarketViralVideoMapper videoMapper;

    public MarketViralFavoriteServiceImpl(
        AiMarketViralFavoriteMapper favoriteMapper,
        AiMarketViralVideoMapper videoMapper
    ) {
        this.favoriteMapper = favoriteMapper;
        this.videoMapper = videoMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean toggle(Long videoId) {
        CurrentUser user = currentUser();
        if (videoId == null) {
            throw invalid("爆款链接ID不能为空");
        }
        AiMarketViralVideo video = videoMapper.selectById(videoId);
        if (video == null || !user.tenantId().equals(video.getTenantId())) {
            throw new BusinessException(ResultCode.NOT_FOUND, "爆款链接不存在");
        }
        AiMarketViralFavorite existing = favoriteMapper.selectOne(
            new LambdaQueryWrapper<AiMarketViralFavorite>()
                .eq(AiMarketViralFavorite::getTenantId, user.tenantId())
                .eq(AiMarketViralFavorite::getUserId, user.userId())
                .eq(AiMarketViralFavorite::getVideoId, videoId)
                .last("LIMIT 1")
        );
        if (existing != null) {
            favoriteMapper.deleteById(existing.getId());
            return false;
        }
        AiMarketViralFavorite favorite = new AiMarketViralFavorite();
        favorite.setTenantId(user.tenantId());
        favorite.setUserId(user.userId());
        favorite.setVideoId(videoId);
        favorite.setCreateTime(LocalDateTime.now());
        try {
            favoriteMapper.insert(favorite);
        } catch (DuplicateKeyException ignored) {
            // A repeated click already produced the desired favorited state.
        }
        return true;
    }

    @Override
    public Set<Long> favoriteVideoIds(Integer tenantId, Integer userId) {
        return favoriteMapper.selectList(new LambdaQueryWrapper<AiMarketViralFavorite>()
                .eq(AiMarketViralFavorite::getTenantId, tenantId)
                .eq(AiMarketViralFavorite::getUserId, userId))
            .stream()
            .map(AiMarketViralFavorite::getVideoId)
            .collect(Collectors.toSet());
    }

    private CurrentUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return new CurrentUser(user.getTenantId() == null ? 1 : user.getTenantId(), user.getUserId());
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ResultCode.PARAM_ERROR, message);
    }

    private record CurrentUser(Integer tenantId, Integer userId) {
    }
}
