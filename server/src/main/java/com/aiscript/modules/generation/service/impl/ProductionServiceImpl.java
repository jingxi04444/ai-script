package com.aiscript.modules.generation.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.generation.dto.DubbingCreateDTO;
import com.aiscript.modules.generation.dto.ExportCreateDTO;
import com.aiscript.modules.generation.dto.TimelineSaveDTO;
import com.aiscript.modules.generation.dto.VideoGenerateDTO;
import com.aiscript.modules.generation.entity.AiDubbingAsset;
import com.aiscript.modules.generation.entity.AiExportJob;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.entity.AiTimelineConfig;
import com.aiscript.modules.generation.entity.AiVideoSegment;
import com.aiscript.modules.generation.mapper.AiDubbingAssetMapper;
import com.aiscript.modules.generation.mapper.AiExportJobMapper;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.mapper.AiTimelineConfigMapper;
import com.aiscript.modules.generation.mapper.AiVideoSegmentMapper;
import com.aiscript.modules.generation.service.ProductionService;
import com.aiscript.modules.generation.vo.DubbingAssetVO;
import com.aiscript.modules.generation.vo.ExportJobVO;
import com.aiscript.modules.generation.vo.TimelineConfigVO;
import com.aiscript.modules.generation.vo.VideoSegmentVO;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipTaskQuotaService;
import com.aiscript.security.LoginUser;
import com.aiscript.task.export.ExportTask;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

@Service
public class ProductionServiceImpl implements ProductionService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private static final Integer DEFAULT_USER_ID = 2;
    private final AiGenerationTaskMapper taskMapper;
    private final AiVideoSegmentMapper videoSegmentMapper;
    private final AiDubbingAssetMapper dubbingAssetMapper;
    private final AiTimelineConfigMapper timelineConfigMapper;
    private final AiExportJobMapper exportJobMapper;
    private final MembershipEntitlementService entitlementService;
    private final MembershipTaskQuotaService taskQuotaService;
    private final StorageClient storageClient;
    private final ExportTask exportTask;

    public ProductionServiceImpl(
        AiGenerationTaskMapper taskMapper,
        AiVideoSegmentMapper videoSegmentMapper,
        AiDubbingAssetMapper dubbingAssetMapper,
        AiTimelineConfigMapper timelineConfigMapper,
        AiExportJobMapper exportJobMapper,
        MembershipEntitlementService entitlementService,
        MembershipTaskQuotaService taskQuotaService,
        StorageClient storageClient,
        ExportTask exportTask
    ) {
        this.taskMapper = taskMapper;
        this.videoSegmentMapper = videoSegmentMapper;
        this.dubbingAssetMapper = dubbingAssetMapper;
        this.timelineConfigMapper = timelineConfigMapper;
        this.exportJobMapper = exportJobMapper;
        this.entitlementService = entitlementService;
        this.taskQuotaService = taskQuotaService;
        this.storageClient = storageClient;
        this.exportTask = exportTask;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public VideoSegmentVO createVideoSegment(VideoGenerateDTO dto) {
        Integer projectId = parseLong(dto.projectId, "项目ID不能为空或格式不正确");
        AiGenerationTask task = createTask(projectId, "generate_video", "视频片段生成", JsonUtils.toJson(dto));
        AiVideoSegment segment = new AiVideoSegment();
        segment.setTenantId(currentTenantId());
        segment.setProjectId(projectId);
        segment.setShotId(StringUtils.hasText(dto.shotId) ? parseLong(dto.shotId, "镜头ID格式不正确") : null);
        segment.setTaskId(task.getId());
        segment.setStatus("pending");
        segment.setTagsJson(dto.tagsJson);
        segment.setDurationSeconds(dto.durationSeconds);
        videoSegmentMapper.insert(segment);
        return toVideoSegmentVO(segment);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DubbingAssetVO createDubbing(DubbingCreateDTO dto) {
        Integer projectId = parseLong(dto.projectId, "项目ID不能为空或格式不正确");
        AiGenerationTask task = createTask(projectId, "tts", "配音生成", JsonUtils.toJson(dto));
        AiDubbingAsset asset = new AiDubbingAsset();
        asset.setTenantId(currentTenantId());
        asset.setProjectId(projectId);
        asset.setTaskId(task.getId());
        asset.setMode(StringUtils.hasText(dto.mode) ? dto.mode : "tts");
        asset.setVoice(dto.voice);
        asset.setSpeed(dto.speed);
        asset.setTone(dto.tone);
        asset.setVolume(dto.volume);
        asset.setLipPrecision(dto.lipPrecision);
        asset.setStatus("pending");
        dubbingAssetMapper.insert(asset);
        return toDubbingAssetVO(asset);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TimelineConfigVO saveTimeline(TimelineSaveDTO dto) {
        Integer projectId = parseLong(dto.projectId, "项目ID不能为空或格式不正确");
        AiTimelineConfig config = timelineConfigMapper.selectOne(new LambdaQueryWrapper<AiTimelineConfig>().eq(AiTimelineConfig::getProjectId, projectId));
        if (config == null) {
            config = new AiTimelineConfig();
            config.setTenantId(currentTenantId());
            config.setProjectId(projectId);
        }
        config.setSelectedClip(dto.selectedClip);
        config.setTransitionEffect(dto.transitionEffect);
        config.setBackgroundMusicAssetId(StringUtils.hasText(dto.backgroundMusicAssetId) ? parseLong(dto.backgroundMusicAssetId, "背景音乐素材ID格式不正确") : null);
        config.setResolution(StringUtils.hasText(dto.resolution) ? dto.resolution : "1080P");
        config.setConfigJson(StringUtils.hasText(dto.configJson) ? dto.configJson : "{}");
        if (config.getId() == null) {
            timelineConfigMapper.insert(config);
        } else {
            timelineConfigMapper.updateById(config);
        }
        return toTimelineConfigVO(config);
    }

    @Override
    public TimelineConfigVO getTimeline(Integer projectId) {
        AiTimelineConfig config = timelineConfigMapper.selectOne(new LambdaQueryWrapper<AiTimelineConfig>().eq(AiTimelineConfig::getProjectId, projectId));
        return config == null ? null : toTimelineConfigVO(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExportJobVO createExport(ExportCreateDTO dto) {
        Integer projectId = StringUtils.hasText(dto.projectId) ? parseLong(dto.projectId, "项目ID格式不正确") : null;
        List<String> scriptIds = dto.scriptIds == null
            ? List.of()
            : dto.scriptIds.stream().filter(StringUtils::hasText).distinct().toList();
        if (scriptIds.size() > 200) throw new BusinessException("单次最多下载 200 条脚本");
        boolean scriptExport = isScriptExport(dto.exportType);
        if (scriptExport && scriptIds.isEmpty() && projectId == null) {
            throw new BusinessException("请选择需要下载的脚本");
        }
        dto.scriptIds = scriptIds;
        if (Boolean.TRUE.equals(dto.removeWatermark)) {
            entitlementService.requireFeature(currentTenantId(), currentUserId(), "REMOVE_WATERMARK");
        }
        AiGenerationTask task = createTask(projectId, "export", "导出任务", JsonUtils.toJson(dto));
        AiExportJob job = new AiExportJob();
        job.setTenantId(currentTenantId());
        job.setProjectId(projectId);
        job.setTaskId(task.getId());
        job.setExportType(StringUtils.hasText(dto.exportType) ? dto.exportType : "video");
        job.setResolution(dto.resolution);
        job.setFileName(StringUtils.hasText(dto.fileName) ? dto.fileName : "export-" + task.getId());
        job.setStatus("pending");
        job.setSourceCount(scriptIds.size());
        job.setProgress(0);
        job.setCreateBy(currentUserId());
        exportJobMapper.insert(job);
        if (scriptExport) launchAfterCommit(job.getId());
        return toExportJobVO(job);
    }

    @Override
    public PageResult<ExportJobVO> exportJobs(PageQuery query, String projectId) {
        LambdaQueryWrapper<AiExportJob> wrapper = new LambdaQueryWrapper<AiExportJob>()
            .eq(AiExportJob::getTenantId, currentTenantId())
            .eq(AiExportJob::getCreateBy, currentUserId());
        if (StringUtils.hasText(projectId)) {
            wrapper.eq(AiExportJob::getProjectId, parseLong(projectId, "项目ID格式不正确"));
        }
        wrapper.orderByDesc(AiExportJob::getCreateTime);
        IPage<AiExportJob> page = exportJobMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toExportJobVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExportJobVO retryExport(Integer id) {
        AiExportJob job = ownedExportJob(id);
        if (!"failed".equals(job.getStatus()) && !"canceled".equals(job.getStatus())) {
            throw new BusinessException("当前下载任务不能重试");
        }
        if (!isScriptExport(job.getExportType())) throw new BusinessException("该导出类型暂不支持重新打包");
        AiGenerationTask previousTask = job.getTaskId() == null ? null : taskMapper.selectById(job.getTaskId());
        String inputPayload = previousTask == null ? "{}" : previousTask.getInputPayload();
        AiGenerationTask retryTask = createTask(job.getProjectId(), "export", "批量下载重试", inputPayload);
        int updated = exportJobMapper.resetForRetry(
            job.getId(), currentTenantId(), currentUserId(), retryTask.getId()
        );
        if (updated != 1) {
            taskQuotaService.release(retryTask.getQuotaRequestNo());
            taskMapper.deleteById(retryTask.getId());
            throw new BusinessException("下载任务状态已变化，请刷新后重试");
        }
        job = ownedExportJob(id);
        launchAfterCommit(job.getId());
        return toExportJobVO(job);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelExport(Integer id) {
        AiExportJob job = ownedExportJob(id);
        if (exportJobMapper.cancelPending(id, currentTenantId(), currentUserId()) != 1) {
            throw new BusinessException("任务已经开始处理，无法取消");
        }
        if (job.getTaskId() != null) {
            AiGenerationTask task = taskMapper.selectById(job.getTaskId());
            if (task != null) {
                taskMapper.markFailed(task.getId(), currentTenantId(), currentUserId(), "CANCELED", "用户取消下载任务");
                taskQuotaService.release(task.getQuotaRequestNo());
            }
        }
    }

    private AiGenerationTask createTask(Integer projectId, String type, String label, String inputPayload) {
        Integer userId = currentUserId();
        String quotaRequestNo = taskQuotaService.reserve(
            currentTenantId(), userId, type, projectId == null ? type : String.valueOf(projectId)
        );
        AiGenerationTask task = new AiGenerationTask();
        task.setTenantId(currentTenantId());
        task.setProjectId(projectId);
        task.setCreateBy(userId);
        task.setTaskType(type);
        task.setProviderCode(type);
        task.setTaskLabel(label);
        task.setStatus("pending");
        task.setProgress(0);
        task.setInputPayload(inputPayload);
        task.setQuotaRequestNo(quotaRequestNo);
        task.setStartTime(LocalDateTime.now());
        try {
            taskMapper.insert(task);
            return task;
        } catch (RuntimeException exception) {
            taskQuotaService.release(quotaRequestNo);
            throw exception;
        }
    }

    private VideoSegmentVO toVideoSegmentVO(AiVideoSegment item) {
        VideoSegmentVO vo = new VideoSegmentVO();
        vo.id = String.valueOf(item.getId());
        vo.projectId = String.valueOf(item.getProjectId());
        vo.shotId = item.getShotId() == null ? null : String.valueOf(item.getShotId());
        vo.taskId = item.getTaskId() == null ? null : String.valueOf(item.getTaskId());
        vo.assetId = item.getAssetId() == null ? null : String.valueOf(item.getAssetId());
        vo.status = item.getStatus();
        vo.tagsJson = item.getTagsJson();
        vo.durationSeconds = item.getDurationSeconds();
        vo.createdAt = item.getCreateTime() == null ? null : item.getCreateTime().toString();
        return vo;
    }

    private DubbingAssetVO toDubbingAssetVO(AiDubbingAsset item) {
        DubbingAssetVO vo = new DubbingAssetVO();
        vo.id = String.valueOf(item.getId());
        vo.projectId = String.valueOf(item.getProjectId());
        vo.taskId = item.getTaskId() == null ? null : String.valueOf(item.getTaskId());
        vo.assetId = item.getAssetId() == null ? null : String.valueOf(item.getAssetId());
        vo.mode = item.getMode();
        vo.voice = item.getVoice();
        vo.speed = item.getSpeed();
        vo.tone = item.getTone();
        vo.volume = item.getVolume();
        vo.lipPrecision = item.getLipPrecision();
        vo.status = item.getStatus();
        vo.createdAt = item.getCreateTime() == null ? null : item.getCreateTime().toString();
        return vo;
    }

    private TimelineConfigVO toTimelineConfigVO(AiTimelineConfig item) {
        TimelineConfigVO vo = new TimelineConfigVO();
        vo.id = String.valueOf(item.getId());
        vo.projectId = String.valueOf(item.getProjectId());
        vo.selectedClip = item.getSelectedClip();
        vo.transitionEffect = item.getTransitionEffect();
        vo.backgroundMusicAssetId = item.getBackgroundMusicAssetId() == null ? null : String.valueOf(item.getBackgroundMusicAssetId());
        vo.resolution = item.getResolution();
        vo.configJson = item.getConfigJson();
        vo.updatedAt = item.getUpdateTime() == null ? null : item.getUpdateTime().toString();
        return vo;
    }

    private ExportJobVO toExportJobVO(AiExportJob item) {
        ExportJobVO vo = new ExportJobVO();
        vo.id = String.valueOf(item.getId());
        vo.projectId = item.getProjectId() == null ? null : String.valueOf(item.getProjectId());
        vo.taskId = item.getTaskId() == null ? null : String.valueOf(item.getTaskId());
        vo.exportType = item.getExportType();
        vo.resolution = item.getResolution();
        vo.fileName = item.getFileName();
        vo.assetId = item.getAssetId() == null ? null : String.valueOf(item.getAssetId());
        vo.status = item.getStatus();
        vo.sourceCount = item.getSourceCount();
        vo.progress = item.getProgress();
        vo.fileSize = item.getFileSize();
        vo.errorMessage = item.getErrorMessage();
        vo.finishTime = item.getFinishTime() == null ? null : item.getFinishTime().toString();
        vo.expireAt = item.getExpireAt() == null ? null : item.getExpireAt().toString();
        if ("success".equals(item.getStatus()) && StringUtils.hasText(item.getStorageKey())
            && (item.getExpireAt() == null || item.getExpireAt().isAfter(LocalDateTime.now()))) {
            vo.downloadUrl = storageClient.presignedUrl(item.getStorageKey());
        }
        vo.removeWatermark = exportTaskRemoveWatermark(item.getTaskId());
        vo.createdAt = item.getCreateTime() == null ? null : item.getCreateTime().toString();
        return vo;
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getUserId();
        }
        return DEFAULT_USER_ID;
    }

    private Boolean exportTaskRemoveWatermark(Integer taskId) {
        if (taskId == null) {
            return false;
        }
        AiGenerationTask task = taskMapper.selectById(taskId);
        if (task == null || !StringUtils.hasText(task.getInputPayload())) {
            return false;
        }
        Object value = JsonUtils.toMap(task.getInputPayload()).get("removeWatermark");
        return value instanceof Boolean enabled && enabled;
    }

    private Integer parseLong(String value, String message) {
        try {
            return Integer.valueOf(value);
        } catch (Exception ex) {
            throw new BusinessException(message);
        }
    }

    private AiExportJob ownedExportJob(Integer id) {
        AiExportJob job = exportJobMapper.selectOwnedById(id, currentTenantId(), currentUserId());
        if (job == null) throw new BusinessException("下载任务不存在");
        return job;
    }

    private void launchAfterCommit(Integer exportJobId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            exportTask.run(exportJobId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                exportTask.run(exportJobId);
            }
        });
    }

    private boolean isScriptExport(String exportType) {
        return "script".equalsIgnoreCase(exportType) || "script_batch".equalsIgnoreCase(exportType);
    }
}
