package com.aiscript.modules.generation.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.generation.entity.AiScriptGenerationQueueItem;
import com.aiscript.modules.generation.entity.AiScriptQueueSetting;
import com.aiscript.modules.generation.mapper.AiScriptGenerationQueueItemMapper;
import com.aiscript.modules.generation.mapper.AiScriptQueueSettingMapper;
import com.aiscript.modules.generation.service.ScriptGenerationQueueService;
import com.aiscript.modules.generation.vo.ScriptQueueItemVO;
import com.aiscript.modules.generation.vo.ScriptQueueStateVO;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.script.service.ScriptReviewService;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class ScriptGenerationQueueServiceImpl implements ScriptGenerationQueueService {
    public static final String CONCURRENCY_BENEFIT = "SCRIPT_QUEUE_CONCURRENCY_LIMIT";
    private static final int RECENT_ITEM_LIMIT = 40;
    private static final int ABSOLUTE_CONCURRENCY_LIMIT = 16;

    private final AiScriptGenerationQueueItemMapper queueMapper;
    private final AiScriptQueueSettingMapper settingMapper;
    private final MembershipEntitlementService entitlementService;
    private final ScriptReviewService scriptReviewService;
    private final ObjectMapper objectMapper;

    public ScriptGenerationQueueServiceImpl(
        AiScriptGenerationQueueItemMapper queueMapper,
        AiScriptQueueSettingMapper settingMapper,
        MembershipEntitlementService entitlementService,
        ScriptReviewService scriptReviewService,
        ObjectMapper objectMapper
    ) {
        this.queueMapper = queueMapper;
        this.settingMapper = settingMapper;
        this.entitlementService = entitlementService;
        this.scriptReviewService = scriptReviewService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptQueueItemVO enqueue(GenerateScriptDTO dto) {
        LoginUser user = currentUser();
        Integer projectId = parseProjectId(dto.getProjectId());
        scriptReviewService.internalAccessForProject(projectId);

        AiScriptGenerationQueueItem existing = queueMapper.selectByRequestNo(
            user.getTenantId(), user.getUserId(), dto.getRequestNo()
        );
        if (existing != null) {
            return toVO(existing);
        }

        String batchNo = queueMapper.selectActiveBatchNo(user.getTenantId(), user.getUserId());
        if (!StringUtils.hasText(batchNo)) {
            batchNo = UUID.randomUUID().toString().replace("-", "");
        }
        AiScriptGenerationQueueItem item = new AiScriptGenerationQueueItem();
        item.setTenantId(user.getTenantId());
        item.setProjectId(projectId);
        item.setCreateBy(user.getUserId());
        item.setUpdateBy(user.getUserId());
        item.setBatchNo(batchNo);
        item.setRequestNo(dto.getRequestNo());
        item.setScriptType(normalizeType(dto.getType()));
        item.setTaskLabel(taskLabel(dto.getType()));
        item.setStatus("pending");
        item.setRequestPayload(writePayload(dto));
        try {
            queueMapper.insert(item);
        } catch (DuplicateKeyException duplicate) {
            AiScriptGenerationQueueItem concurrent = queueMapper.selectByRequestNo(
                user.getTenantId(), user.getUserId(), dto.getRequestNo()
            );
            if (concurrent != null) return toVO(concurrent);
            throw duplicate;
        }
        return toVO(item);
    }

    @Override
    public ScriptQueueStateVO state() {
        LoginUser user = currentUser();
        return state(user.getTenantId(), user.getUserId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptQueueStateVO updateConcurrency(int concurrency) {
        LoginUser user = currentUser();
        int maximum = maxConcurrency(user.getTenantId(), user.getUserId());
        if (concurrency < 1 || concurrency > maximum) {
            throw new BusinessException(
                ResultCode.FORBIDDEN,
                maximum <= 1 ? "并行生成是至尊版功能，当前套餐仅支持串行队列" : "并发数不能超过 " + maximum
            );
        }
        AiScriptQueueSetting setting = settingMapper.selectOwned(user.getTenantId(), user.getUserId());
        if (setting == null) {
            setting = new AiScriptQueueSetting();
            setting.setTenantId(user.getTenantId());
            setting.setUserId(user.getUserId());
            setting.setConcurrencyLimit(concurrency);
            setting.setCreateBy(user.getUserId());
            setting.setUpdateBy(user.getUserId());
            settingMapper.insert(setting);
        } else {
            settingMapper.update(null, new LambdaUpdateWrapper<AiScriptQueueSetting>()
                .eq(AiScriptQueueSetting::getId, setting.getId())
                .set(AiScriptQueueSetting::getConcurrencyLimit, concurrency));
        }
        return state(user.getTenantId(), user.getUserId());
    }

    @Override
    public void cancel(Long id) {
        LoginUser user = currentUser();
        int updated = queueMapper.update(null, new LambdaUpdateWrapper<AiScriptGenerationQueueItem>()
            .eq(AiScriptGenerationQueueItem::getId, id)
            .eq(AiScriptGenerationQueueItem::getTenantId, user.getTenantId())
            .eq(AiScriptGenerationQueueItem::getCreateBy, user.getUserId())
            .eq(AiScriptGenerationQueueItem::getStatus, "pending")
            .set(AiScriptGenerationQueueItem::getStatus, "canceled")
            .set(AiScriptGenerationQueueItem::getFinishTime, java.time.LocalDateTime.now()));
        if (updated != 1) {
            throw new BusinessException(ResultCode.CONFLICT, "只有等待中的任务可以取消");
        }
    }

    public int configuredConcurrency(Integer tenantId, Integer userId) {
        int maximum = maxConcurrency(tenantId, userId);
        AiScriptQueueSetting setting = settingMapper.selectOwned(tenantId, userId);
        int configured = setting == null || setting.getConcurrencyLimit() == null
            ? 1
            : setting.getConcurrencyLimit();
        return Math.max(1, Math.min(configured, maximum));
    }

    private ScriptQueueStateVO state(Integer tenantId, Integer userId) {
        List<AiScriptGenerationQueueItem> items = queueMapper.selectRecentOwned(
            tenantId, userId, RECENT_ITEM_LIMIT
        );
        int pending = queueMapper.countOwnedStatus(tenantId, userId, "pending");
        int running = queueMapper.countOwnedStatus(tenantId, userId, "running");
        int maximum = maxConcurrency(tenantId, userId);
        ScriptQueueStateVO state = new ScriptQueueStateVO();
        state.setItems(items.stream().map(this::toVO).toList());
        state.setPendingCount(pending);
        state.setRunningCount(running);
        state.setActiveCount(pending + running);
        state.setConcurrency(configuredConcurrency(tenantId, userId));
        state.setMaxConcurrency(maximum);
        state.setParallelConfigurable(maximum > 1);
        return state;
    }

    private int maxConcurrency(Integer tenantId, Integer userId) {
        try {
            long limit = entitlementService.getLimit(tenantId, userId, CONCURRENCY_BENEFIT);
            if (limit < 0) return ABSOLUTE_CONCURRENCY_LIMIT;
            return (int) Math.max(1, Math.min(limit, ABSOLUTE_CONCURRENCY_LIMIT));
        } catch (BusinessException missingBenefit) {
            log.debug("脚本队列并发权益尚未配置，按串行模式运行，userId={}", userId);
            return 1;
        }
    }

    private String writePayload(GenerateScriptDTO dto) {
        try {
            return objectMapper.writeValueAsString(dto);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("脚本生成参数无法入队");
        }
    }

    private ScriptQueueItemVO toVO(AiScriptGenerationQueueItem item) {
        ScriptQueueItemVO vo = new ScriptQueueItemVO();
        vo.setId(String.valueOf(item.getId()));
        vo.setProjectId(item.getProjectId() == null ? null : String.valueOf(item.getProjectId()));
        vo.setBatchNo(item.getBatchNo());
        vo.setScriptType(item.getScriptType());
        vo.setTaskLabel(item.getTaskLabel());
        vo.setStatus(item.getStatus());
        vo.setScriptId(item.getScriptId() == null ? null : String.valueOf(item.getScriptId()));
        vo.setErrorMessage(item.getErrorMessage());
        vo.setCreatedAt(item.getCreateTime());
        vo.setStartTime(item.getStartTime());
        vo.setFinishTime(item.getFinishTime());
        return vo;
    }

    private Integer parseProjectId(String value) {
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException exception) {
            throw new BusinessException("项目参数错误");
        }
    }

    private String normalizeType(String type) {
        return switch (type == null ? "" : type) {
            case "viral", "template", "original" -> type;
            default -> "original";
        };
    }

    private String taskLabel(String type) {
        return switch (normalizeType(type)) {
            case "viral" -> "爆款复刻脚本";
            case "template" -> "模板脚本";
            default -> "AI 原创脚本";
        };
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        if (TenantContext.getTenantId() == null) TenantContext.setTenantId(user.getTenantId());
        return user;
    }
}
