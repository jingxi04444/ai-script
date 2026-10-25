package com.aiscript.modules.market.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.config.MarketViralProperties;
import com.aiscript.integration.viral.ViralSearchCandidate;
import com.aiscript.integration.viral.ViralSearchClient;
import com.aiscript.integration.viral.ViralSearchResult;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.market.dto.MarketViralQueryDTO;
import com.aiscript.modules.market.dto.MarketViralRefreshDTO;
import com.aiscript.modules.market.entity.AiMarketViralVideo;
import com.aiscript.modules.market.mapper.AiMarketViralVideoMapper;
import com.aiscript.modules.market.service.MarketViralService;
import com.aiscript.modules.market.service.MarketViralFavoriteService;
import com.aiscript.modules.market.task.MarketViralRefreshTask;
import com.aiscript.modules.market.vo.MarketViralRefreshVO;
import com.aiscript.modules.market.vo.MarketViralVideoVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Lazy;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.DigestUtils;
import org.springframework.util.StringUtils;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class MarketViralServiceImpl implements MarketViralService {
    private static final Set<String> PLATFORMS = Set.of("douyin", "xiaohongshu");
    private static final List<String> DEFAULT_PLATFORMS = List.of("douyin", "xiaohongshu");
    private static final String TASK_TYPE = "market_viral_refresh";
    private final AiMarketViralVideoMapper videoMapper;
    private final AiGenerationTaskMapper taskMapper;
    private final ViralSearchClient viralSearchClient;
    private final MarketViralFavoriteService favoriteService;
    private final MarketViralProperties properties;
    private final MarketViralRefreshTask refreshTask;

    public MarketViralServiceImpl(
        AiMarketViralVideoMapper videoMapper,
        AiGenerationTaskMapper taskMapper,
        ViralSearchClient viralSearchClient,
        MarketViralFavoriteService favoriteService,
        MarketViralProperties properties,
        @Lazy MarketViralRefreshTask refreshTask
    ) {
        this.videoMapper = videoMapper;
        this.taskMapper = taskMapper;
        this.viralSearchClient = viralSearchClient;
        this.favoriteService = favoriteService;
        this.properties = properties;
        this.refreshTask = refreshTask;
    }

    @Override
    public PageResult<MarketViralVideoVO> page(MarketViralQueryDTO query) {
        CurrentUser user = currentUser();
        long page = query == null || query.getPage() == null ? 1 : query.getPage();
        long pageSize = query == null || query.getPageSize() == null ? 20 : query.getPageSize();
        if (page < 1 || page > 1_000_000 || pageSize < 1 || pageSize > 100) {
            throw invalid("分页参数超出范围");
        }
        String category = canonicalCategory(query == null ? null : query.getCategory());
        String platform = normalizePlatform(query == null ? null : query.getPlatform(), false);
        String keyword = query == null ? "" : safeText(query.getKeyword(), 100);
        boolean favoriteOnly = query != null && Boolean.TRUE.equals(query.getFavoriteOnly());
        Set<Long> favoriteIds = favoriteService.favoriteVideoIds(user.tenantId(), user.userId());
        if (favoriteOnly && favoriteIds.isEmpty()) {
            return PageResult.empty(page, pageSize);
        }
        LocalDateTime freshness = LocalDateTime.now().minusDays(Math.max(1, properties.getFreshnessDays()));
        LambdaQueryWrapper<AiMarketViralVideo> wrapper = new LambdaQueryWrapper<AiMarketViralVideo>()
            .eq(AiMarketViralVideo::getTenantId, user.tenantId())
            .eq(StringUtils.hasText(category), AiMarketViralVideo::getCategory, category)
            .eq(StringUtils.hasText(platform), AiMarketViralVideo::getPlatform, platform);
        if (!favoriteOnly) {
            wrapper.ge(AiMarketViralVideo::getLastSeenAt, freshness);
        }
        if (favoriteOnly) {
            wrapper.in(AiMarketViralVideo::getId, favoriteIds);
        }
        if (StringUtils.hasText(keyword)) {
            wrapper.and(nested -> nested.like(AiMarketViralVideo::getTitle, keyword)
                .or().like(AiMarketViralVideo::getAuthorName, keyword)
                .or().like(AiMarketViralVideo::getTags, keyword));
        }
        wrapper.orderByDesc(AiMarketViralVideo::getLikeCount)
            .orderByDesc(AiMarketViralVideo::getPublishedAt)
            .orderByDesc(AiMarketViralVideo::getId);
        Page<AiMarketViralVideo> result = videoMapper.selectPage(new Page<>(page, pageSize), wrapper);
        return new PageResult<>(
            result.getRecords().stream().map(item -> toVO(item, favoriteIds)).toList(),
            result.getTotal(),
            result.getCurrent(),
            result.getSize(),
            result.getPages()
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MarketViralRefreshVO createRefreshTask(MarketViralRefreshDTO dto) {
        CurrentUser user = currentUser();
        if (dto == null || !StringUtils.hasText(dto.getCategory())) {
            throw invalid("品类不能为空");
        }
        String category = canonicalCategory(safeRequired(dto.getCategory(), "品类", 40));
        Set<String> platforms = new LinkedHashSet<>();
        for (String platform : dto.getPlatforms() == null ? List.<String>of() : dto.getPlatforms()) {
            String normalized = normalizePlatform(platform, false);
            if (StringUtils.hasText(normalized)) {
                platforms.add(normalized);
            }
        }
        if (platforms.isEmpty()) {
            platforms.addAll(DEFAULT_PLATFORMS);
        }
        String requestNo = StringUtils.hasText(dto.getRequestNo())
            ? safeRequired(dto.getRequestNo(), "请求编号", 80)
            : UUID.randomUUID().toString();
        String rawKey = user.tenantId() + "|" + user.userId() + "|" + category + "|"
            + String.join(",", platforms) + "|" + requestNo;
        String idempotencyKey = "market-viral:" + DigestUtils.md5DigestAsHex(rawKey.getBytes(java.nio.charset.StandardCharsets.UTF_8))
            + ":" + DigestUtils.md5DigestAsHex(requestNo.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        AiGenerationTask existing = taskMapper.selectByIdempotencyKey(user.tenantId(), idempotencyKey);
        if (existing != null) {
            return new MarketViralRefreshVO(String.valueOf(existing.getId()), existing.getStatus());
        }

        MarketViralRefreshDTO snapshot = new MarketViralRefreshDTO();
        snapshot.setCategory(category);
        snapshot.setPlatforms(new ArrayList<>(platforms));
        snapshot.setRequestNo(requestNo);
        AiGenerationTask task = new AiGenerationTask();
        task.setTenantId(user.tenantId());
        task.setCreateBy(user.userId());
        task.setTaskType(TASK_TYPE);
        task.setTaskLabel("品类爆款采集：" + category);
        task.setStatus("pending");
        task.setProgress(0);
        task.setInputPayload(JsonUtils.toJson(snapshot));
        task.setIdempotencyKey(idempotencyKey);
        try {
            taskMapper.insert(task);
        } catch (DuplicateKeyException exception) {
            AiGenerationTask concurrent = taskMapper.selectByIdempotencyKey(user.tenantId(), idempotencyKey);
            if (concurrent == null) {
                throw exception;
            }
            return new MarketViralRefreshVO(String.valueOf(concurrent.getId()), concurrent.getStatus());
        }
        Integer taskId = task.getId();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    refreshTask.run(taskId);
                }
            });
        } else {
            refreshTask.run(taskId);
        }
        return new MarketViralRefreshVO(String.valueOf(taskId), "pending");
    }

    @Override
    public void executeRefreshTask(Integer taskId) {
        AiGenerationTask task = taskMapper.selectById(taskId);
        if (task == null || !TASK_TYPE.equals(task.getTaskType())) {
            return;
        }
        if (taskMapper.markRunning(taskId, task.getTenantId(), task.getCreateBy()) != 1) {
            return;
        }
        try {
            MarketViralRefreshDTO input = JsonUtils.fromJson(task.getInputPayload(), MarketViralRefreshDTO.class);
            if (input == null || input.getPlatforms() == null || input.getPlatforms().isEmpty()) {
                throw new BusinessException("品类爆款任务参数不完整");
            }
            ViralSearchResult searchResult = viralSearchClient.search(
                task.getTenantId(), input.getCategory(), new LinkedHashSet<>(input.getPlatforms())
            );
            Map<String, ViralSearchCandidate> accepted = new LinkedHashMap<>();
            for (ViralSearchCandidate candidate : searchResult.candidates()) {
                accepted.merge(candidate.platform() + ":" + candidate.externalId(), candidate, (left, right) ->
                    right.likeCount() > left.likeCount() ? right : left
                );
            }
            int changed = 0;
            for (ViralSearchCandidate candidate : accepted.values()) {
                changed += upsert(task.getTenantId(), task.getCreateBy(), candidate);
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("category", input.getCategory());
            result.put("platforms", input.getPlatforms());
            result.put("rawCandidates", searchResult.rawCandidateCount());
            result.put("accepted", accepted.size());
            result.put("filtered", searchResult.filteredCount());
            result.put("stored", changed);
            result.put("rejectedReasons", searchResult.rejectedReasons());
            result.put("rejectedSamples", searchResult.rejectedSamples());
            result.put("warnings", searchResult.warnings());
            result.put("refreshedAt", LocalDateTime.now().toString());
            taskMapper.markSuccess(taskId, task.getTenantId(), task.getCreateBy(), JsonUtils.toJson(result));
        } catch (RuntimeException exception) {
            log.error("Market viral refresh failed, taskId={}", taskId, exception);
            String message = StringUtils.hasText(exception.getMessage()) ? exception.getMessage() : "品类爆款采集失败";
            taskMapper.markFailed(taskId, task.getTenantId(), task.getCreateBy(), "MARKET_VIRAL_REFRESH_FAILED",
                safeText(message, 1000));
        }
    }

    private int upsert(Integer tenantId, Integer userId, ViralSearchCandidate candidate) {
        AiMarketViralVideo existing = videoMapper.selectOne(new LambdaQueryWrapper<AiMarketViralVideo>()
            .eq(AiMarketViralVideo::getTenantId, tenantId)
            .eq(AiMarketViralVideo::getPlatform, candidate.platform())
            .eq(AiMarketViralVideo::getExternalId, candidate.externalId())
            .last("LIMIT 1"));
        AiMarketViralVideo entity = existing == null ? new AiMarketViralVideo() : existing;
        entity.setTenantId(tenantId);
        entity.setCategory(safeText(candidate.category(), 40));
        entity.setPlatform(candidate.platform());
        entity.setExternalId(safeText(candidate.externalId(), 120));
        entity.setTitle(safeText(candidate.title(), 500));
        entity.setAuthorName(safeText(candidate.authorName(), 160));
        entity.setSourceUrl(safeText(candidate.sourceUrl(), 2000));
        entity.setCoverUrl(safeText(candidate.coverUrl(), 2000));
        entity.setTags(safeText(candidate.tags(), 1000));
        entity.setDurationSeconds(candidate.durationSeconds());
        entity.setLikeCount(candidate.likeCount());
        entity.setCommentCount(candidate.commentCount());
        entity.setCollectCount(candidate.collectCount());
        entity.setShareCount(candidate.shareCount());
        entity.setPublishedAt(candidate.publishedAt());
        entity.setLastSeenAt(LocalDateTime.now());
        entity.setDiscoveryQuery(safeText(candidate.discoveryQuery(), 100));
        entity.setUpdateBy(userId);
        entity.setUpdateTime(LocalDateTime.now());
        if (existing == null) {
            entity.setCreateBy(userId);
            entity.setCreateTime(LocalDateTime.now());
            entity.setDeleted(0);
            videoMapper.insert(entity);
        } else {
            videoMapper.updateById(entity);
        }
        return 1;
    }

    private MarketViralVideoVO toVO(AiMarketViralVideo video, Set<Long> favoriteIds) {
        MarketViralVideoVO vo = new MarketViralVideoVO();
        vo.setId(video.getId() == null ? null : video.getId().toString());
        vo.setCategory(video.getCategory());
        vo.setPlatform(video.getPlatform());
        vo.setExternalId(video.getExternalId());
        vo.setTitle(video.getTitle());
        vo.setAuthorName(video.getAuthorName());
        vo.setSourceUrl(video.getSourceUrl());
        vo.setCoverUrl(video.getCoverUrl());
        vo.setTags(video.getTags());
        vo.setDurationSeconds(video.getDurationSeconds());
        vo.setLikeCount(video.getLikeCount());
        vo.setCommentCount(video.getCommentCount());
        vo.setCollectCount(video.getCollectCount());
        vo.setShareCount(video.getShareCount());
        vo.setPublishedAt(video.getPublishedAt());
        vo.setLastSeenAt(video.getLastSeenAt());
        vo.setDiscoveryQuery(video.getDiscoveryQuery());
        vo.setFavorited(favoriteIds.contains(video.getId()));
        return vo;
    }

    private CurrentUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        int tenantId = user.getTenantId() == null ? 1 : user.getTenantId();
        return new CurrentUser(tenantId, user.getUserId());
    }

    private String normalizePlatform(String value, boolean required) {
        String platform = safeText(value, 32).toLowerCase(java.util.Locale.ROOT);
        if (!StringUtils.hasText(platform)) {
            if (required) {
                throw invalid("平台不能为空");
            }
            return "";
        }
        if (!PLATFORMS.contains(platform)) {
            throw invalid("只支持抖音和小红书");
        }
        return platform;
    }

    private static String safeRequired(String value, String label, int maxLength) {
        String result = safeText(value, maxLength);
        if (!StringUtils.hasText(result)) {
            throw invalid(label + "不能为空");
        }
        return result;
    }

    private static String safeText(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String text = value.replace("\u0000", "").trim();
        return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ResultCode.PARAM_ERROR, message);
    }

    private static String canonicalCategory(String value) {
        String category = safeText(value, 40);
        return Set.of("油烟机", "抽油烟机", "吸油烟机").contains(category) ? "油烟机" : category;
    }

    private record CurrentUser(int tenantId, Integer userId) {
    }
}
