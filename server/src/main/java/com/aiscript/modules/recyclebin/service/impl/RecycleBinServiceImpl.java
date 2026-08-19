package com.aiscript.modules.recyclebin.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.recyclebin.dto.RecycleBinQueryDTO;
import com.aiscript.modules.recyclebin.entity.AiRecycleBin;
import com.aiscript.modules.recyclebin.mapper.AiRecycleBinMapper;
import com.aiscript.modules.recyclebin.service.RecycleBinService;
import com.aiscript.modules.recyclebin.vo.RecycleBinItemVO;
import com.aiscript.modules.recyclebin.vo.RecycleBinSummaryVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class RecycleBinServiceImpl implements RecycleBinService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private static final String ACTIVE = "active";
    private static final String RESTORED = "restored";
    private static final String PURGED = "purged";
    private static final Set<String> RESOURCE_TYPES = Set.of(PROJECT, BRIEF, SCRIPT);

    private final AiRecycleBinMapper recycleBinMapper;
    private final int retentionDays;

    public RecycleBinServiceImpl(
        AiRecycleBinMapper recycleBinMapper,
        @Value("${aiscript.recycle-bin.retention-days:7}") int retentionDays
    ) {
        this.recycleBinMapper = recycleBinMapper;
        this.retentionDays = Math.max(1, retentionDays);
    }

    @Override
    public void moveProject(AiProject project) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("projectName", project.getProjectName());
        snapshot.put("category", project.getCategory());
        snapshot.put("avatarUrl", project.getAvatarUrl());
        createRecord(PROJECT, project.getId(), project.getProjectName(), null, snapshot);
    }

    @Override
    public void moveBrief(AiBrief brief) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("briefName", brief.getBriefName());
        snapshot.put("productName", brief.getProductName());
        snapshot.put("productModel", brief.getProductModel());
        createRecord(
            BRIEF,
            brief.getId(),
            firstNonBlank(brief.getProductName(), brief.getBriefName(), "未命名 Brief"),
            brief.getProjectId(),
            snapshot
        );
    }

    @Override
    public void moveScript(AiStoryboardScript script) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("scriptName", script.getScriptName());
        snapshot.put("scriptType", script.getScriptType());
        snapshot.put("status", script.getStatus());
        createRecord(
            SCRIPT,
            script.getId(),
            firstNonBlank(script.getScriptName(), "未命名脚本"),
            script.getProjectId(),
            snapshot
        );
    }

    @Override
    public PageResult<RecycleBinItemVO> page(RecycleBinQueryDTO query) {
        LambdaQueryWrapper<AiRecycleBin> wrapper = ownedActiveWrapper()
            .orderByDesc(AiRecycleBin::getDeletedAt);
        if (StringUtils.hasText(query.getResourceType())) {
            String resourceType = normalizeResourceType(query.getResourceType());
            wrapper.eq(AiRecycleBin::getResourceType, resourceType);
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(AiRecycleBin::getResourceName, query.getKeyword().trim());
        }
        IPage<AiRecycleBin> result = recycleBinMapper.selectPage(
            new Page<>(query.getPage(), query.getPageSize()),
            wrapper
        );
        return new PageResult<>(
            result.getRecords().stream().map(this::toVO).toList(),
            result.getTotal(),
            result.getCurrent(),
            result.getSize(),
            result.getPages()
        );
    }

    @Override
    public RecycleBinSummaryVO summary() {
        RecycleBinSummaryVO summary = new RecycleBinSummaryVO();
        summary.setProjectCount(countByType(PROJECT));
        summary.setBriefCount(countByType(BRIEF));
        summary.setScriptCount(countByType(SCRIPT));
        summary.setTotal(summary.getProjectCount() + summary.getBriefCount() + summary.getScriptCount());
        summary.setRetentionDays(retentionDays);
        return summary;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restore(Integer id) {
        restoreRecord(ownedActiveRecord(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restoreBatch(List<Integer> ids) {
        requireIds(ids);
        ids.stream().distinct().forEach(id -> restoreRecord(ownedActiveRecord(id)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void purge(Integer id) {
        purgeRecord(ownedActiveRecord(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void purgeBatch(List<Integer> ids) {
        requireIds(ids);
        ids.stream().distinct().forEach(id -> purgeRecord(ownedActiveRecord(id)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cleanupExpired() {
        int cleaned = 0;
        while (cleaned < 1000) {
            List<Integer> ids = recycleBinMapper.selectExpiredIds(Math.min(100, 1000 - cleaned));
            if (ids.isEmpty()) break;
            List<AiRecycleBin> records = recycleBinMapper.selectBatchIds(ids).stream()
                .filter(record -> ACTIVE.equals(record.getRecycleStatus()))
                .toList();
            for (AiRecycleBin record : records) purgeRecord(record);
            cleaned += records.size();
            if (records.size() < ids.size()) break;
        }
        return cleaned;
    }

    private void createRecord(
        String resourceType,
        Integer resourceId,
        String resourceName,
        Integer parentId,
        Map<String, Object> snapshot
    ) {
        LoginUser user = currentUser();
        Long existing = recycleBinMapper.selectCount(new LambdaQueryWrapper<AiRecycleBin>()
            .eq(AiRecycleBin::getTenantId, currentTenantId())
            .eq(AiRecycleBin::getDeletedBy, user.getUserId())
            .eq(AiRecycleBin::getResourceType, resourceType)
            .eq(AiRecycleBin::getResourceId, resourceId)
            .eq(AiRecycleBin::getRecycleStatus, ACTIVE));
        if (existing != null && existing > 0) return;

        LocalDateTime now = LocalDateTime.now();
        AiRecycleBin record = new AiRecycleBin();
        record.setTenantId(currentTenantId());
        record.setResourceType(resourceType);
        record.setResourceId(resourceId);
        record.setResourceName(firstNonBlank(resourceName, "未命名内容"));
        record.setParentId(parentId);
        record.setSnapshotJson(JsonUtils.toJson(snapshot));
        record.setRetentionDays(retentionDays);
        record.setRecycleStatus(ACTIVE);
        record.setDeletedBy(user.getUserId());
        record.setDeletedAt(now);
        record.setExpireAt(now.plusDays(retentionDays));
        recycleBinMapper.insert(record);
    }

    private void restoreRecord(AiRecycleBin record) {
        int restored = switch (record.getResourceType()) {
            case PROJECT -> recycleBinMapper.restoreProject(record.getTenantId(), record.getResourceId());
            case BRIEF -> recycleBinMapper.restoreBrief(record.getTenantId(), record.getResourceId());
            case SCRIPT -> recycleBinMapper.restoreScript(record.getTenantId(), record.getResourceId());
            default -> throw new BusinessException("不支持恢复该类型内容");
        };
        if (restored == 0) throw new BusinessException("原始数据已被清理，无法恢复");
        record.setRecycleStatus(RESTORED);
        record.setRestoreTime(LocalDateTime.now());
        recycleBinMapper.updateById(record);
    }

    private void purgeRecord(AiRecycleBin record) {
        switch (record.getResourceType()) {
            case PROJECT -> purgeProject(record);
            case BRIEF -> purgeBrief(record);
            case SCRIPT -> purgeScript(record);
            default -> throw new BusinessException("不支持永久删除该类型内容");
        }
        record.setRecycleStatus(PURGED);
        record.setPurgeTime(LocalDateTime.now());
        recycleBinMapper.updateById(record);
    }

    private void purgeProject(AiRecycleBin record) {
        recycleBinMapper.purgeProjectBriefRefs(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeProjectLinks(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeProjectCollaborators(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeProjectSteps(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeProject(record.getTenantId(), record.getResourceId());
    }

    private void purgeBrief(AiRecycleBin record) {
        recycleBinMapper.purgeBriefProjectRefs(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeBriefAiResults(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeBriefCollaborators(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeBriefEditRequests(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeBriefShareLinks(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeBriefSharePackItems(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeBriefSellingPoints(record.getResourceId());
        recycleBinMapper.purgeBrief(record.getTenantId(), record.getResourceId());
    }

    private void purgeScript(AiRecycleBin record) {
        recycleBinMapper.purgeScriptPolishMessages(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeScriptReviewAccess(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeScriptReviewLinks(record.getTenantId(), record.getResourceId());
        recycleBinMapper.purgeScript(record.getTenantId(), record.getResourceId());
    }

    private AiRecycleBin ownedActiveRecord(Integer id) {
        AiRecycleBin record = recycleBinMapper.selectOne(ownedActiveWrapper()
            .eq(AiRecycleBin::getId, id)
            .last("LIMIT 1 FOR UPDATE"));
        if (record == null) throw new BusinessException("回收站内容不存在或已处理");
        return record;
    }

    private LambdaQueryWrapper<AiRecycleBin> ownedActiveWrapper() {
        return new LambdaQueryWrapper<AiRecycleBin>()
            .eq(AiRecycleBin::getTenantId, currentTenantId())
            .eq(AiRecycleBin::getDeletedBy, currentUser().getUserId())
            .eq(AiRecycleBin::getRecycleStatus, ACTIVE);
    }

    private long countByType(String resourceType) {
        Long count = recycleBinMapper.selectCount(ownedActiveWrapper()
            .eq(AiRecycleBin::getResourceType, resourceType));
        return count == null ? 0L : count;
    }

    private RecycleBinItemVO toVO(AiRecycleBin record) {
        RecycleBinItemVO vo = new RecycleBinItemVO();
        vo.setId(String.valueOf(record.getId()));
        vo.setResourceType(record.getResourceType());
        vo.setResourceId(String.valueOf(record.getResourceId()));
        vo.setResourceName(record.getResourceName());
        vo.setParentId(record.getParentId() == null ? null : String.valueOf(record.getParentId()));
        vo.setRetentionDays(record.getRetentionDays());
        vo.setRemainingDays(remainingDays(record.getExpireAt()));
        vo.setDeletedAt(toText(record.getDeletedAt()));
        vo.setExpireAt(toText(record.getExpireAt()));
        return vo;
    }

    private long remainingDays(LocalDateTime expireAt) {
        if (expireAt == null || !expireAt.isAfter(LocalDateTime.now())) return 0L;
        long seconds = Duration.between(LocalDateTime.now(), expireAt).getSeconds();
        return Math.max(1L, (seconds + 86_399L) / 86_400L);
    }

    private String normalizeResourceType(String resourceType) {
        String normalized = resourceType.trim().toLowerCase();
        if (!RESOURCE_TYPES.contains(normalized)) throw new BusinessException("回收站类型不正确");
        return normalized;
    }

    private void requireIds(List<Integer> ids) {
        if (ids == null || ids.isEmpty()) throw new BusinessException("请选择回收站内容");
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException("请先登录");
        }
        return loginUser;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) if (StringUtils.hasText(value)) return value.trim();
        return "";
    }

    private String toText(LocalDateTime value) {
        return value == null ? null : value.toString();
    }
}
