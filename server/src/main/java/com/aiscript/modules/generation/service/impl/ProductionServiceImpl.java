package com.aiscript.modules.generation.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.JsonUtils;
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
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    public ProductionServiceImpl(
        AiGenerationTaskMapper taskMapper,
        AiVideoSegmentMapper videoSegmentMapper,
        AiDubbingAssetMapper dubbingAssetMapper,
        AiTimelineConfigMapper timelineConfigMapper,
        AiExportJobMapper exportJobMapper,
        MembershipEntitlementService entitlementService,
        MembershipTaskQuotaService taskQuotaService
    ) {
        this.taskMapper = taskMapper;
        this.videoSegmentMapper = videoSegmentMapper;
        this.dubbingAssetMapper = dubbingAssetMapper;
        this.timelineConfigMapper = timelineConfigMapper;
        this.exportJobMapper = exportJobMapper;
        this.entitlementService = entitlementService;
        this.taskQuotaService = taskQuotaService;
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
        job.setCreateBy(DEFAULT_USER_ID);
        exportJobMapper.insert(job);
        return toExportJobVO(job);
    }

    @Override
    public PageResult<ExportJobVO> exportJobs(PageQuery query, String projectId) {
        LambdaQueryWrapper<AiExportJob> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(projectId)) {
            wrapper.eq(AiExportJob::getProjectId, parseLong(projectId, "项目ID格式不正确"));
        }
        wrapper.orderByDesc(AiExportJob::getCreateTime);
        IPage<AiExportJob> page = exportJobMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toExportJobVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
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
}
