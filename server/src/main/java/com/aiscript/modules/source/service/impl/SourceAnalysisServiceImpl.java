package com.aiscript.modules.source.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.common.util.UrlUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.integration.asr.AsrClient;
import com.aiscript.integration.llm.LlmClient;
import com.aiscript.integration.parser.VideoParserClient;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.service.PaidOperationClaim;
import com.aiscript.modules.generation.service.PaidOperationCompletion;
import com.aiscript.modules.generation.service.PaidOperationCoordinator;
import com.aiscript.modules.generation.service.PaidOperationFailure;
import com.aiscript.modules.generation.service.PaidOperationFingerprint;
import com.aiscript.modules.generation.service.PaidOperationSpec;
import com.aiscript.modules.generation.vo.GenerationTaskVO;
import com.aiscript.modules.source.convert.SourceConvert;
import com.aiscript.modules.source.dto.CopyAnalyzeDTO;
import com.aiscript.modules.source.dto.CopyExtractDTO;
import com.aiscript.modules.source.dto.LinkExtractDTO;
import com.aiscript.modules.source.dto.SourceParseDTO;
import com.aiscript.modules.source.entity.AiSourceAnalysis;
import com.aiscript.modules.source.entity.AiSourceReport;
import com.aiscript.modules.source.mapper.AiSourceAnalysisMapper;
import com.aiscript.modules.source.mapper.AiSourceReportMapper;
import com.aiscript.modules.source.service.SourceAnalysisService;
import com.aiscript.modules.source.vo.AnalysisDimensionVO;
import com.aiscript.modules.source.vo.LinkExtractVO;
import com.aiscript.modules.source.vo.SourceAnalysisVO;
import com.aiscript.modules.system.service.PromptRenderService;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipTaskQuotaService;
import com.aiscript.modules.project.service.ProjectCollaborationService;
import com.aiscript.security.LoginUser;
import com.aiscript.task.parser.VideoParseTask;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.context.annotation.Lazy;
import org.springframework.util.StringUtils;

@Service
@Slf4j

public class SourceAnalysisServiceImpl implements SourceAnalysisService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiSourceAnalysisMapper analysisMapper;
    private final AiSourceReportMapper reportMapper;
    private final AiGenerationTaskMapper taskMapper;
    private final VideoParserClient videoParserClient;
    private final AsrClient asrClient;
    private final LlmClient llmClient;
    private final PromptRenderService promptRenderService;
    private final VideoParseTask videoParseTask;
    private final MembershipEntitlementService entitlementService;
    private final MembershipTaskQuotaService taskQuotaService;
    private final ProjectCollaborationService projectCollaborationService;
    private final PaidOperationCoordinator paidOperationCoordinator;
    private final PaidOperationFingerprint paidOperationFingerprint;
    private static final List<DimensionSpec> DIMENSION_SPECS = List.of(
        new DimensionSpec("paragraphStructure", "段落结构拆解"),
        new DimensionSpec("keyIssues", "需要特别指出"),
        new DimensionSpec("fullDeepReport", "完整深度拉片报告"),
        new DimensionSpec("structureFormula", "结构公式总结"),
        new DimensionSpec("replicationPoints", "复刻要点"),
        new DimensionSpec("editingSuggestions", "剪辑建议")
    );

    public SourceAnalysisServiceImpl(
        AiSourceAnalysisMapper analysisMapper,
        AiSourceReportMapper reportMapper,
        AiGenerationTaskMapper taskMapper,
        VideoParserClient videoParserClient,
        AsrClient asrClient,
        LlmClient llmClient,
        PromptRenderService promptRenderService,
        @Lazy
        VideoParseTask videoParseTask
        , MembershipEntitlementService entitlementService,
        MembershipTaskQuotaService taskQuotaService,
        ProjectCollaborationService projectCollaborationService,
        PaidOperationCoordinator paidOperationCoordinator,
        PaidOperationFingerprint paidOperationFingerprint
    ) {
        this.analysisMapper = analysisMapper;
        this.reportMapper = reportMapper;
        this.taskMapper = taskMapper;
        this.videoParserClient = videoParserClient;
        this.asrClient = asrClient;
        this.llmClient = llmClient;
        this.promptRenderService = promptRenderService;
        this.videoParseTask = videoParseTask;
        this.entitlementService = entitlementService;
        this.taskQuotaService = taskQuotaService;
        this.projectCollaborationService = projectCollaborationService;
        this.paidOperationCoordinator = paidOperationCoordinator;
        this.paidOperationFingerprint = paidOperationFingerprint;
    }

    @Override
    public List<SourceAnalysisVO> list(Integer projectId) {
        projectCollaborationService.requireAccess(projectId);
        return analysisMapper.selectList(new LambdaQueryWrapper<AiSourceAnalysis>()
                .eq(AiSourceAnalysis::getProjectId, projectId)
                .orderByDesc(AiSourceAnalysis::getCreateTime))
            .stream()
            .map(this::toVOWithDimensions)
            .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SourceAnalysisVO parseShareUrl(SourceParseDTO dto) {
        if (!StringUtils.hasText(dto.getProjectId()) || !StringUtils.hasText(dto.getUrl())) {
            throw new BusinessException("项目ID和分享链接不能为空");
        }
        Integer projectId;
        try {
            projectId = Integer.valueOf(dto.getProjectId());
        } catch (NumberFormatException exception) {
            throw new BusinessException("项目参数错误");
        }
        projectCollaborationService.requireAccess(projectId);
        String mode = "deep".equals(dto.getMode()) ? "deep" : "simple";
        dto.setMode(mode);
        boolean deepMode = "deep".equals(mode);
        LoginUser user = currentUser();
        Integer tenantId = user.getTenantId() == null ? currentTenantId() : user.getTenantId();
        entitlementService.requireFeature(
            tenantId, user.getUserId(),
            deepMode ? "VIRAL_DEEP_ACCESS" : "VIRAL_SIMPLE_ACCESS"
        );
        String operationCode = deepMode ? "viral_deep" : "viral_simple";
        PaidOperationClaim paidClaim = paidOperationCoordinator.claim(new PaidOperationSpec(
            tenantId,
            user.getUserId(),
            projectId,
            operationCode,
            "paid_viral_parse",
            deepMode ? "爆款深度解析" : "爆款简易解析",
            dto.getRequestNo(),
            paidOperationFingerprint.sha256(Map.of(
                "projectId", projectId,
                "url", dto.getUrl().trim(),
                "mode", mode
            )),
            dto.getExpectedPointCost()
        ));
        if (!paidClaim.newlyClaimed()) {
            return replayViralParse(paidClaim);
        }
        boolean refundRegistered = registerPaidOperationRefundAfterRollback(
            paidClaim, tenantId, user.getUserId(), "VIRAL_PARSE_FAILED", "爆款解析未完成"
        );
        try {
            SourceAnalysisVO result = parseAndPersist(dto, true);
            paidOperationCoordinator.complete(new PaidOperationCompletion(
                paidClaim.taskId(), tenantId, user.getUserId(), JsonUtils.toJson(result)
            ));
            return result;
        } catch (RuntimeException exception) {
            refundPaidOperationWithoutSynchronization(
                refundRegistered, paidClaim, tenantId, user.getUserId(),
                "VIRAL_PARSE_FAILED", exception
            );
            throw exception;
        }
    }

    private SourceAnalysisVO replayViralParse(PaidOperationClaim claim) {
        if (claim.isSuccess()) {
            SourceAnalysisVO replay = JsonUtils.fromJson(claim.resultPayload(), SourceAnalysisVO.class);
            if (replay != null) {
                return replay;
            }
            throw new BusinessException(ResultCode.CONFLICT, "爆款解析结果记录不完整，请重新解析");
        }
        if (claim.isFailed()) {
            throw new BusinessException(ResultCode.CONFLICT, "上次爆款解析已失败并退回水滴，请重新解析");
        }
        throw new BusinessException(ResultCode.CONFLICT, "爆款解析正在处理，请稍后重试");
    }

    private boolean registerPaidOperationRefundAfterRollback(
        PaidOperationClaim claim,
        Integer tenantId,
        Integer userId,
        String errorCode,
        String errorMessage
    ) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return false;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    try {
                        paidOperationCoordinator.failAndRefund(new PaidOperationFailure(
                            claim.taskId(), tenantId, userId, errorCode, errorMessage
                        ));
                    } catch (RuntimeException refundFailure) {
                        log.error("爆款解析回滚后退回水滴失败，taskId={}", claim.taskId(), refundFailure);
                    }
                }
            }
        });
        return true;
    }

    private void refundPaidOperationWithoutSynchronization(
        boolean refundRegistered,
        PaidOperationClaim claim,
        Integer tenantId,
        Integer userId,
        String errorCode,
        RuntimeException exception
    ) {
        if (refundRegistered) {
            return;
        }
        try {
            paidOperationCoordinator.failAndRefund(new PaidOperationFailure(
                claim.taskId(), tenantId, userId, errorCode,
                exception.getMessage() == null ? "付费操作未完成" : exception.getMessage()
            ));
        } catch (RuntimeException refundFailure) {
            log.error("爆款解析失败后退回水滴失败，taskId={}", claim.taskId(), refundFailure);
        }
    }

    @Override
    public LinkExtractVO extractShareUrl(LinkExtractDTO dto) {
        String shareUrl = UrlUtils.extractFirstHttpUrl(dto.getText());
        if (!StringUtils.hasText(shareUrl)) {
            throw new BusinessException("未识别到有效链接，请粘贴包含 http/https 的分享内容");
        }
        LinkExtractVO vo = new LinkExtractVO();
        vo.setShareUrl(shareUrl);
        vo.setPlatform(detectPlatform(shareUrl));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public GenerationTaskVO createParseTask(SourceParseDTO dto) {
        if (!StringUtils.hasText(dto.getProjectId()) || !StringUtils.hasText(dto.getUrl())) {
            throw new BusinessException("项目ID和分享链接不能为空");
        }
        Integer projectId = parseProjectId(dto.getProjectId());
        projectCollaborationService.requireAccess(projectId);
        Integer tenantId = currentTenantId();
        String idempotencyKey = buildParseVideoIdempotencyKey(dto);
        AiGenerationTask existingTask = findTaskByIdempotencyKey(tenantId, idempotencyKey);
        if (existingTask != null) {
            return handleExistingParseTask(existingTask);
        }
        LoginUser user = currentUser();
        String quotaRequestNo = taskQuotaService.reserve(
            tenantId, user.getUserId(), "parse_video", idempotencyKey
        );
        AiGenerationTask task = new AiGenerationTask();
        task.setTenantId(tenantId);
        task.setProjectId(projectId);
        task.setTaskType("parse_video");
        task.setTaskLabel("视频链接解析");
        task.setStatus("running");
        task.setProgress(5);
        task.setInputPayload(JsonUtils.toJson(dto));
        task.setIdempotencyKey(idempotencyKey);
        task.setQuotaRequestNo(quotaRequestNo);
        task.setCreateBy(user.getUserId());
        task.setStartTime(LocalDateTime.now());
        try {
            taskMapper.insert(task);
            runVideoParseTaskAfterCommit(task.getId());
            return toTaskVO(task);
        } catch (DuplicateKeyException ignored) {
            taskQuotaService.release(quotaRequestNo);
            AiGenerationTask duplicateTask = findTaskByIdempotencyKey(tenantId, idempotencyKey);
            if (duplicateTask == null) {
                throw ignored;
            }
            return handleExistingParseTask(duplicateTask);
        } catch (RuntimeException exception) {
            taskQuotaService.release(quotaRequestNo);
            throw exception;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SourceAnalysisVO executeParseTask(Integer taskId) {
        AiGenerationTask task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException("任务不存在");
        }
        if ("success".equals(task.getStatus())) {
            SourceAnalysisVO result = JsonUtils.fromJson(task.getResultPayload(), SourceAnalysisVO.class);
            if (result != null) {
                return result;
            }
        }
        task.setStatus("running");
        task.setProgress(Math.max(task.getProgress() == null ? 0 : task.getProgress(), 10));
        if (task.getStartTime() == null) {
            task.setStartTime(LocalDateTime.now());
        }
        taskMapper.updateById(task);
        try {
            SourceParseDTO dto = JsonUtils.fromJson(task.getInputPayload(), SourceParseDTO.class);
            SourceAnalysisVO result = parseAndPersist(dto, true);
            task.setStatus("success");
            task.setProgress(100);
            task.setResultPayload(JsonUtils.toJson(result));
            task.setFinishTime(LocalDateTime.now());
            taskMapper.updateById(task);
            return result;
        } catch (Exception ex) {
            task.setStatus("failed");
            task.setProgress(100);
            task.setErrorCode("PARSE_VIDEO_FAILED");
            task.setErrorMessage(ex.getMessage());
            task.setFinishTime(LocalDateTime.now());
            taskMapper.updateById(task);
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("视频解析任务失败：" + ex.getMessage());
        } finally {
            taskQuotaService.release(task.getQuotaRequestNo());
        }
    }

    private SourceAnalysisVO parseAndPersist(SourceParseDTO dto, boolean transcribe) {
        if (!StringUtils.hasText(dto.getProjectId()) || !StringUtils.hasText(dto.getUrl())) {
            throw new BusinessException("项目ID和分享链接不能为空");
        }
        Map<String, Object> parsed = videoParserClient.parseShareUrl(dto.getUrl());
        String videoUrl = stringValue(parsed.getOrDefault("videoUrl", dto.getUrl()));
        String title = stringValue(parsed.get("title"));
        requireExtractedContent(parsed, videoUrl);
        String copy = "";
        if (transcribe && shouldTranscribe(videoUrl, parsed)) {
            copy = asrClient.transcribe(videoUrl);
            if (StringUtils.hasText(copy)) {
                parsed = new java.util.HashMap<>(parsed);
                parsed.put("transcript", copy);
                parsed.put("copy", copy);
                parsed.put("copySource", "asr");
            }
        }
        if (!StringUtils.hasText(copy)) {
            copy = firstText(
                parsed.get("transcript"),
                parsed.get("copy"),
                parsed.get("desc"),
                parsed.get("description")
            );
        }
        if (!StringUtils.hasText(copy) && StringUtils.hasText(title) && !"外部视频链接".equals(title)) {
            copy = title;
        }
        CopyCleanupResult cleanupResult = cleanupCopyWithLlm(copy);
        String cleanedCopy = cleanupResult.text();
        if (StringUtils.hasText(copy)) {
            parsed = new java.util.HashMap<>(parsed);
            parsed.put("copyCleanupApplied", cleanupResult.llmApplied());
        }
        AiSourceAnalysis analysis = new AiSourceAnalysis();
        analysis.setTenantId(currentTenantId());
        analysis.setProjectId(Integer.valueOf(dto.getProjectId()));
        analysis.setMode(StringUtils.hasText(dto.getMode()) ? dto.getMode() : "viral");
        analysis.setSourceUrl(stringValue(parsed.getOrDefault("sourceUrl", dto.getUrl())));
        analysis.setPlatform(String.valueOf(parsed.getOrDefault("platform", detectPlatform(dto.getUrl()))));
        analysis.setTitle(StringUtils.hasText(title) ? title : "待解析内容");
        analysis.setAuthorName(String.valueOf(parsed.getOrDefault("authorName", "")));
        analysis.setCoverUrl(String.valueOf(parsed.getOrDefault("coverUrl", "")));
        analysis.setVideoUrl(videoUrl);
        analysis.setMetricsJson(JsonUtils.toJson(parsed));
        analysis.setEditableCopy(cleanedCopy);
        analysis.setStructureSummary(structureSummary(analysis.getEditableCopy(), dto.getMode()));
        analysis.setStatus(String.valueOf(parsed.getOrDefault("status", "parsed")));
        analysisMapper.insert(analysis);
        saveReport(analysis, "link_analysis", parsed);
        if (StringUtils.hasText(copy)) {
            saveReport(analysis, "asr", Map.of("text", copy, "videoUrl", videoUrl));
            saveReport(analysis, "copy_cleanup", Map.of(
                "rawCopy", copy,
                "cleanedCopy", cleanedCopy,
                "llmApplied", cleanupResult.llmApplied()
            ));
        }
        return toVOWithDimensions(analysis);
    }

    private String firstText(Object... values) {
        for (Object value : values) {
            String text = stringValue(value);
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return "";
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private boolean shouldTranscribe(String videoUrl, Map<String, Object> parsed) {
        if (!StringUtils.hasText(videoUrl)) {
            return false;
        }
        String parseMode = stringValue(parsed.get("parseMode"));
        return "real_video".equals(parseMode) && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://"));
    }

    private void requireExtractedContent(Map<String, Object> parsed, String videoUrl) {
        String parseMode = stringValue(parsed.get("parseMode"));
        boolean hasCopy = StringUtils.hasText(firstText(
            parsed.get("transcript"),
            parsed.get("copy"),
            parsed.get("text"),
            parsed.get("description"),
            parsed.get("desc")
        ));
        boolean hasDirectVideo = "real_video".equals(parseMode)
            && StringUtils.hasText(videoUrl)
            && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://"));
        boolean hasGallery = "image_gallery".equals(parseMode)
            && parsed.get("images") instanceof List<?> images
            && !images.isEmpty();
        if (!hasCopy && !hasDirectVideo && !hasGallery) {
            throw new BusinessException("视频链接解析失败，未获取到可识别的视频地址或文案");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SourceAnalysisVO extractCopy(CopyExtractDTO dto) {
        if (!StringUtils.hasText(dto.getProjectId())) {
            throw new BusinessException("项目ID不能为空");
        }
        Integer projectId = parseProjectId(dto.getProjectId());
        projectCollaborationService.requireAccess(projectId);
        String rawCopy = StringUtils.hasText(dto.getText()) ? dto.getText() : asrClient.transcribe(dto.getVideoUrl());
        if (!StringUtils.hasText(rawCopy)) {
            throw new BusinessException("未能提取到文案内容");
        }
        CopyCleanupResult cleanupResult = cleanupCopyWithLlm(rawCopy);
        String cleanedCopy = cleanupResult.text();
        AiSourceAnalysis analysis = new AiSourceAnalysis();
        analysis.setTenantId(currentTenantId());
        analysis.setProjectId(projectId);
        analysis.setMode("original");
        analysis.setSourceUrl(dto.getVideoUrl());
        analysis.setVideoUrl(dto.getVideoUrl());
        analysis.setTitle("文案提取结果");
        analysis.setEditableCopy(cleanedCopy);
        analysis.setStructureSummary("已提取可编辑文案");
        analysis.setStatus("parsed");
        analysisMapper.insert(analysis);
        saveReport(analysis, "copy", Map.of("copy", rawCopy));
        saveReport(analysis, "copy_cleanup", Map.of(
            "rawCopy", rawCopy,
            "cleanedCopy", cleanedCopy,
            "llmApplied", cleanupResult.llmApplied()
        ));
        return toVOWithDimensions(analysis);
    }

    private CopyCleanupResult cleanupCopyWithLlm(String rawCopy) {
        if (!StringUtils.hasText(rawCopy)) {
            return new CopyCleanupResult("", false);
        }
        PromptRenderService.RenderedPrompt renderedPrompt = promptRenderService.render(
            "source_copy_cleanup",
            COPY_CLEANUP_SYSTEM_PROMPT,
            COPY_CLEANUP_USER_PROMPT,
            Map.of("copy", rawCopy)
        );
        try {
            String result = llmClient.chat(renderedPrompt.getSystemPrompt(), renderedPrompt.getUserPrompt());
            if (StringUtils.hasText(result) && !"{}".equals(result.trim())) {
                String cleaned = result.trim()
                    .replaceFirst("^```(?:text)?\\s*", "")
                    .replaceFirst("\\s*```$", "")
                    .trim();
                if (StringUtils.hasText(cleaned)) {
                    return new CopyCleanupResult(cleaned, true);
                }
            }
        } catch (RuntimeException ex) {
            log.warn("文案整理调用LLM失败，已回退原始文案：{}", ex.getMessage());
        }
        return new CopyCleanupResult(rawCopy, false);
    }

    private Integer parseProjectId(String rawProjectId) {
        try {
            return Integer.valueOf(rawProjectId);
        } catch (NumberFormatException exception) {
            throw new BusinessException("项目参数错误");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SourceAnalysisVO analyzeCopy(CopyAnalyzeDTO dto) {
        if (!StringUtils.hasText(dto.getProjectId()) || !StringUtils.hasText(dto.getCopy())
            || !StringUtils.hasText(dto.getSourceAnalysisId())) {
            throw new BusinessException("请先确认解析当前模式的爆款链接");
        }
        String mode = StringUtils.hasText(dto.getMode()) ? dto.getMode() : "simple";
        LoginUser user = currentUser();
        boolean deepMode = "deep".equals(mode);
        entitlementService.requireFeature(
            user.getTenantId(), user.getUserId(),
            deepMode ? "VIRAL_DEEP_ACCESS" : "VIRAL_SIMPLE_ACCESS"
        );
        Integer projectId;
        Integer sourceAnalysisId;
        try {
            projectId = Integer.valueOf(dto.getProjectId());
            sourceAnalysisId = Integer.valueOf(dto.getSourceAnalysisId());
        } catch (NumberFormatException exception) {
            throw new BusinessException("爆款解析参数错误，请重新解析");
        }
        projectCollaborationService.requireAccess(projectId);
        AiSourceAnalysis paidParse = analysisMapper.selectOne(
            new LambdaQueryWrapper<AiSourceAnalysis>()
                .eq(AiSourceAnalysis::getId, sourceAnalysisId)
                .eq(AiSourceAnalysis::getProjectId, projectId)
                .eq(AiSourceAnalysis::getTenantId, currentTenantId())
                .eq(AiSourceAnalysis::getCreateBy, user.getUserId())
                .eq(AiSourceAnalysis::getMode, mode)
                .ne(AiSourceAnalysis::getSourceUrl, "copy-analysis")
                .last("LIMIT 1")
        );
        if (paidParse == null) {
            throw new BusinessException("解析模式已变化，请按当前模式重新确认解析");
        }
        String llmResult = analyzeCopyWithLlm(dto.getCopy(), mode);
        List<AnalysisDimensionVO> dimensions = parseAnalysisDimensions(llmResult, dto.getCopy(), mode);
        String summary = deepMode && !dimensions.isEmpty() ? dimensionsToSummary(dimensions) : llmResult;
        AiSourceAnalysis analysis = new AiSourceAnalysis();
        analysis.setTenantId(currentTenantId());
        analysis.setProjectId(projectId);
        analysis.setMode(mode);
        analysis.setSourceUrl("copy-analysis");
        analysis.setVideoUrl("");
        analysis.setTitle("文案结构分析");
        analysis.setEditableCopy(dto.getCopy());
        analysis.setStructureSummary(summary);
        analysis.setStatus("analyzed");
        analysisMapper.insert(analysis);
        saveReport(analysis, "copy_structure", Map.of("mode", mode, "copy", dto.getCopy(), "structure", summary, "llmResult", llmResult));
        SourceAnalysisVO vo = SourceConvert.toVO(analysis);
        vo.setDimensions(dimensions);
        return vo;
    }

    private String analyzeCopyWithLlm(String copy, String mode) {
        boolean deepMode = "deep".equals(mode);
        String sceneCode = deepMode ? "source_copy_deep_analyze" : "source_copy_simple_analyze";
        PromptRenderService.RenderedPrompt renderedPrompt = promptRenderService.render(
            sceneCode,
            deepMode ? DEEP_ANALYZE_SYSTEM_PROMPT : SIMPLE_ANALYZE_SYSTEM_PROMPT,
            deepMode ? DEEP_ANALYZE_USER_PROMPT : SIMPLE_ANALYZE_USER_PROMPT,
            Map.of("copy", copy)
        );
        try {
            String result = llmClient.chat(renderedPrompt.getSystemPrompt(), renderedPrompt.getUserPrompt());
            if (StringUtils.hasText(result) && !"{}".equals(result.trim())) {
                return result;
            }
        } catch (RuntimeException ignored) {
            log.error("llm ignored:{}", ignored.getMessage());
            // LLM 不可用时返回本地兜底，保证页面流程不中断。
        }
        return structureSummary(copy, mode);
    }

    private static final String SIMPLE_ANALYZE_SYSTEM_PROMPT = "你是商业短视频爆款文案结构分析专家。请基于用户提供的原始文案，输出简洁、清晰、可复刻的文案结构分析。只输出中文编号段落，不要输出 JSON。";

    private static final String COPY_CLEANUP_SYSTEM_PROMPT = "你是专业的短视频ASR逐字稿校对员。这份逐字稿将用于拆解爆款文案，必须忠实保留每一个原始口语信息。你只能纠正上下文完全明确的明显同音错字、补充标点和按语义分段；不得删除、改写、调换、概括或补充任何词语。只输出整理后的纯文本，不要标题、说明、Markdown或JSON。";

    private static final String COPY_CLEANUP_USER_PROMPT = """
        请整理下面的短视频ASR原始逐字稿：

        {{copy}}

        整理要求（必须全部遵守）：
        1. 只纠正上下文完全明确的同音、近音造成的明显错别字；不确定时保持原样，不得润色；
        2. 严禁删减任何内容。所有口头禅、重复词、填充词（例如“那个、然后、就是、嗯、啊”）、语气词、口吃、卡顿、倒装以及没说完的话，都必须原样保留；
        3. 在不删减、不合并、不调整词语顺序的前提下分段。每个以“。！？；”结束的完整句子必须单独占一行；同一句内部的逗号停顿不得强制换行；
        4. 标点必须体现原始口语语气：疑问使用“？”，感叹使用“！”，句中停顿使用“，”或“、”；只有完整陈述句才使用“。”，严禁把所有句子统一处理成句号结尾；
        5. 不总结、不概括、不分析、不改写、不重新组织，也不得添加原文没有的信息；
        6. 只返回整理后的完整文案，不要附带任何说明或标记。
        """;

    private static final String SIMPLE_ANALYZE_USER_PROMPT = """
        原始文案：
        {{copy}}

        请对这段短视频文案做“简易文案解析”，重点分析文案本身，不做复杂镜头拆解。

        请按以下编号段落输出：

        1. 文案整体作用
        说明这段文案主要想完成什么目标，例如吸引注意、制造痛点、建立信任、引导购买等。

        2. 段落结构拆解
        按文案顺序拆分结构，说明每一段的作用。

        3. 开头钩子
        提炼开头吸引用户继续看的关键话术。

        4. 痛点/卖点表达
        提炼文案中出现的用户痛点、产品卖点、利益点。

        5. 情绪推进
        说明文案从开头到结尾的情绪变化。

        6. 结构公式
        总结成可复用公式，例如：开头钩子 → 痛点放大 → 产品解决方案 → 信任背书 → 行动引导。

        7. 可复刻要点
        给出后续生成脚本时可以复用的表达方式。
        """;

    private static final String DEEP_ANALYZE_SYSTEM_PROMPT = "你是商业短视频爆款拉片分析专家。必须只输出合法 JSON，不要 Markdown，不要解释。JSON 必须包含 dimensions 六项，key/title 固定为：paragraphStructure/段落结构拆解、keyIssues/需要特别指出、fullDeepReport/完整深度拉片报告、structureFormula/结构公式总结、replicationPoints/复刻要点、editingSuggestions/剪辑建议，且每项 content 非空。";

    private static final String DEEP_ANALYZE_USER_PROMPT = """
        原始文案：
        {{copy}}

        请对这条短视频做“深度拉片拆解”。即使当前只提供了文案，也请基于文案内容推断可能的镜头节奏、情绪推进、画面设计和转化逻辑。

        只输出 JSON，不要使用 ```json 代码块，不要添加 JSON 之外的任何说明。格式必须严格如下：
        {"dimensions":[{"key":"paragraphStructure","title":"段落结构拆解","content":"按开头 0-3 秒、中段铺垫、卖点展开、信任增强、结尾转化拆解结构和作用"},{"key":"keyIssues","title":"需要特别指出","content":"指出爆点、钩子、风险、强转化点、需要保留或规避的表达"},{"key":"fullDeepReport","title":"完整深度拉片报告","content":"完整说明视频核心目的、镜头画面推测、节奏、情绪、转场、卖点表达和转化逻辑"},{"key":"structureFormula","title":"结构公式总结","content":"总结成可复用爆款公式，例如：强钩子 → 场景痛点 → 产品解决 → 结果证明 → 限时行动"},{"key":"replicationPoints","title":"复刻要点","content":"说明后续脚本生成和拍摄时必须复刻的结构、话术、情绪节奏，以及可以替换成新产品的内容"},{"key":"editingSuggestions","title":"剪辑建议","content":"给出剪辑节奏、字幕花字、转场、BGM、产品特写和镜头衔接建议"}]}

        要求：六项 content 都不能为空；如果原文信息不足，也要基于文案合理推断。
        """;

    private SourceAnalysisVO toVOWithDimensions(AiSourceAnalysis analysis) {
        SourceAnalysisVO vo = SourceConvert.toVO(analysis);
        vo.setDimensions(parseAnalysisDimensions(analysis.getStructureSummary(), analysis.getEditableCopy(), analysis.getMode()));
        return vo;
    }

    @SuppressWarnings("unchecked")
    private List<AnalysisDimensionVO> parseAnalysisDimensions(String text, String copy, String mode) {
        String json = extractJson(text);
        if (StringUtils.hasText(json)) {
            Map<String, Object> map = JsonUtils.toMap(json);
            Object raw = map.get("dimensions");
            if (raw instanceof List<?> list) {
                Map<String, String> contents = new LinkedHashMap<>();
                for (Object item : list) {
                    if (item instanceof Map<?, ?> itemMap) {
                        contents.put(stringValue(itemMap.get("key")), stringValue(itemMap.get("content")));
                    }
                }
                List<AnalysisDimensionVO> parsed = buildDimensions(contents);
                if (isComplete(parsed)) return parsed;
            }
        }
        List<AnalysisDimensionVO> split = splitTextDimensions(text);
        if (!split.isEmpty()) return split;
        return "deep".equals(mode) ? fallbackDimensions(copy, mode) : List.of();
    }

    private String extractJson(String text) {
        if (!StringUtils.hasText(text)) return "";
        Matcher fence = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE).matcher(text);
        if (fence.find()) return fence.group(1).trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return start >= 0 && end > start ? text.substring(start, end + 1).trim() : "";
    }

    private List<AnalysisDimensionVO> splitTextDimensions(String text) {
        if (!StringUtils.hasText(text)) return List.of();
        Pattern pattern = Pattern.compile("(?:^|\\n)\\s*(?:\\d+[.、]|[-*])?\\s*([^\\n:：]{2,30})\\s*(?:[:：]|\\n)\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\d+[.、]|[-*])?\\s*[^\\n:：]{2,30}\\s*(?:[:：]|\\n)|$)");
        Matcher matcher = pattern.matcher(text);
        List<AnalysisDimensionVO> dimensions = new ArrayList<>();
        int index = 0;
        while (matcher.find()) {
            String title = matcher.group(1);
            String content = matcher.group(2).trim();
            if (StringUtils.hasText(title) && StringUtils.hasText(content)) {
                DimensionSpec spec = DIMENSION_SPECS.get(Math.min(index, DIMENSION_SPECS.size() - 1));
                AnalysisDimensionVO vo = new AnalysisDimensionVO();
                vo.setKey(spec.key());
                vo.setTitle(title.trim());
                vo.setContent(content);
                dimensions.add(vo);
                index++;
            }
        }
        return dimensions;
    }

    private List<AnalysisDimensionVO> buildDimensions(Map<String, String> contents) {
        List<AnalysisDimensionVO> dimensions = new ArrayList<>();
        for (DimensionSpec spec : DIMENSION_SPECS) {
            AnalysisDimensionVO vo = new AnalysisDimensionVO();
            vo.setKey(spec.key());
            vo.setTitle(spec.title());
            vo.setContent(contents.getOrDefault(spec.key(), ""));
            dimensions.add(vo);
        }
        return dimensions;
    }

    private boolean isComplete(List<AnalysisDimensionVO> dimensions) {
        return dimensions != null && dimensions.size() == DIMENSION_SPECS.size()
            && dimensions.stream().allMatch(item -> StringUtils.hasText(item.getContent()));
    }

    private List<AnalysisDimensionVO> fallbackDimensions(String copy, String mode) {
        String summary = structureSummary(copy, mode);
        Map<String, String> contents = Map.of(
            "paragraphStructure", summary,
            "keyIssues", "重点关注开头钩子、用户痛点、卖点证明和结尾转化是否连贯。",
            "fullDeepReport", "当前未获得完整模型分析，建议按开场吸引、痛点放大、卖点展开、信任证明、行动引导复核。",
            "structureFormula", "开场钩子 → 痛点共鸣 → 卖点解决 → 信任背书 → 行动引导。",
            "replicationPoints", "复刻强钩子、具体场景、结果承诺和口语化表达，替换为当前产品卖点。",
            "editingSuggestions", "使用快节奏字幕突出关键词，卖点段配产品特写，结尾强化行动按钮或优惠信息。"
        );
        return buildDimensions(contents);
    }

    private String dimensionsToSummary(List<AnalysisDimensionVO> dimensions) {
        return dimensions.stream()
            .map(item -> item.getTitle() + "：" + item.getContent())
            .toList()
            .stream()
            .reduce((left, right) -> left + "\n" + right)
            .orElse("");
    }


    private record DimensionSpec(String key, String title) {
    }
    private record CopyCleanupResult(String text, boolean llmApplied) {
    }

    private void saveReport(AiSourceAnalysis analysis, String type, Map<String, Object> content) {
        AiSourceReport report = new AiSourceReport();
        report.setTenantId(analysis.getTenantId());
        report.setAnalysisId(analysis.getId());
        report.setReportType(type);
        report.setReportContent(JsonUtils.toJson(content));
        reportMapper.insert(report);
    }

    private GenerationTaskVO toTaskVO(AiGenerationTask task) {
        GenerationTaskVO vo = new GenerationTaskVO();
        vo.setId(String.valueOf(task.getId()));
        vo.setStatus(task.getStatus());
        vo.setProgress(task.getProgress());
        vo.setResult(task.getResultPayload());
        vo.setErrorMessage(task.getErrorMessage());
        return vo;
    }

    private String buildParseVideoIdempotencyKey(SourceParseDTO dto) {
        return "parse_video:" + dto.getProjectId() + ":" + dto.getUrl();
    }

    private AiGenerationTask findTaskByIdempotencyKey(Integer tenantId, String idempotencyKey) {
        return taskMapper.selectOne(new LambdaQueryWrapper<AiGenerationTask>()
            .eq(AiGenerationTask::getTenantId, tenantId)
            .eq(AiGenerationTask::getIdempotencyKey, idempotencyKey)
            .last("limit 1"));
    }

    private GenerationTaskVO handleExistingParseTask(AiGenerationTask task) {
        if ("failed".equals(task.getStatus())) {
            LocalDateTime now = LocalDateTime.now();
            int updated = taskMapper.update(null, new LambdaUpdateWrapper<AiGenerationTask>()
                .eq(AiGenerationTask::getId, task.getId())
                .eq(AiGenerationTask::getStatus, "failed")
                .set(AiGenerationTask::getStatus, "running")
                .set(AiGenerationTask::getProgress, 5)
                .set(AiGenerationTask::getErrorCode, null)
                .set(AiGenerationTask::getErrorMessage, null)
                .set(AiGenerationTask::getResultPayload, null)
                .set(AiGenerationTask::getStartTime, now)
                .set(AiGenerationTask::getFinishTime, null));
            if (updated > 0) {
                LoginUser user = currentUser();
                String quotaRequestNo = taskQuotaService.reserve(
                    currentTenantId(), user.getUserId(), "parse_video", task.getIdempotencyKey()
                );
                task.setStatus("running");
                task.setProgress(5);
                task.setErrorCode(null);
                task.setErrorMessage(null);
                task.setResultPayload(null);
                task.setStartTime(now);
                task.setFinishTime(null);
                task.setQuotaRequestNo(quotaRequestNo);
                taskMapper.updateById(task);
                runVideoParseTaskAfterCommit(task.getId());
            } else {
                task = taskMapper.selectById(task.getId());
            }
        }
        return toTaskVO(task);
    }

    private void runVideoParseTaskAfterCommit(Integer taskId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            videoParseTask.run(taskId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                videoParseTask.run(taskId);
            }
        });
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser;
        }
        throw new BusinessException("请先登录");
    }
    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private String detectPlatform(String url) {
        String lowerUrl = url == null ? "" : url.toLowerCase();
        if (lowerUrl.contains("douyin")) {
            return "douyin";
        }
        if (lowerUrl.contains("xiaohongshu") || lowerUrl.contains("xhs")) {
            return "xiaohongshu";
        }
        if (lowerUrl.contains("kuaishou")) {
            return "kuaishou";
        }
        if (lowerUrl.contains("bilibili") || lowerUrl.contains("b23.tv")) {
            return "bilibili";
        }
        if (lowerUrl.contains("weibo")) {
            return "weibo";
        }
        if (lowerUrl.contains("ixigua") || lowerUrl.contains("xigua")) {
            return "xigua";
        }
        if (lowerUrl.contains("pipix") || lowerUrl.contains("pipigaoxiao")) {
            return "pipixia";
        }
        if (lowerUrl.contains("weishi")) {
            return "weishi";
        }
        if (lowerUrl.contains("acfun")) {
            return "acfun";
        }
        if (lowerUrl.contains("haokan")) {
            return "haokan";
        }
        if (lowerUrl.contains("twitter") || lowerUrl.contains("x.com")) {
            return "twitter";
        }
        return "unknown";
    }

    private String structureSummary(String copy, String mode) {
        if (!StringUtils.hasText(copy)) {
            return "已解析链接元信息，未提取到可分析文案";
        }
        int length = copy.length();
        String scene = StringUtils.hasText(mode) ? mode : "viral";
        return "模式：" + scene + "；文案长度：" + length + "；建议按 开场钩子-痛点放大-卖点证明-行动号召 结构复核。";
    }
}
