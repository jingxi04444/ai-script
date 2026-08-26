package com.aiscript.task.export;

import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.generation.dto.ExportCreateDTO;
import com.aiscript.modules.generation.entity.AiExportJob;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiExportJobMapper;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.membership.service.MembershipTaskQuotaService;
import com.aiscript.modules.notification.service.NotificationService;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class ExportTask {
    private static final int ERROR_MESSAGE_LIMIT = 2000;

    private final AiExportJobMapper exportJobMapper;
    private final AiGenerationTaskMapper taskMapper;
    private final AiStoryboardScriptMapper scriptMapper;
    private final StorageClient storageClient;
    private final ScriptBatchArchiveBuilder archiveBuilder;
    private final NotificationService notificationService;
    private final MembershipTaskQuotaService taskQuotaService;
    private final ObjectMapper objectMapper;
    private final int retentionDays;

    public ExportTask(
        AiExportJobMapper exportJobMapper,
        AiGenerationTaskMapper taskMapper,
        AiStoryboardScriptMapper scriptMapper,
        StorageClient storageClient,
        ScriptBatchArchiveBuilder archiveBuilder,
        NotificationService notificationService,
        MembershipTaskQuotaService taskQuotaService,
        ObjectMapper objectMapper,
        @Value("${aiscript.exports.retention-days:7}") int retentionDays
    ) {
        this.exportJobMapper = exportJobMapper;
        this.taskMapper = taskMapper;
        this.scriptMapper = scriptMapper;
        this.storageClient = storageClient;
        this.archiveBuilder = archiveBuilder;
        this.notificationService = notificationService;
        this.taskQuotaService = taskQuotaService;
        this.objectMapper = objectMapper;
        this.retentionDays = Math.max(1, retentionDays);
    }

    @Async("aiTaskExecutor")
    public void run(Integer exportJobId) {
        AiExportJob job = exportJobMapper.selectById(exportJobId);
        if (job == null || exportJobMapper.markRunning(exportJobId) != 1) return;

        AiGenerationTask task = job.getTaskId() == null ? null : taskMapper.selectById(job.getTaskId());
        if (task != null) taskMapper.markRunning(task.getId(), job.getTenantId(), job.getCreateBy());
        try {
            ExportCreateDTO request = readRequest(task);
            List<AiStoryboardScript> scripts = loadScripts(job, request);
            if (scripts.isEmpty()) throw new IllegalStateException("没有可导出的脚本");

            exportJobMapper.updateProgress(job.getId(), 35);
            byte[] archive = archiveBuilder.build(scripts);
            exportJobMapper.updateProgress(job.getId(), 75);

            String fileName = zipFileName(job.getFileName());
            String objectKey = "exports/" + job.getTenantId() + "/" + job.getCreateBy() + "/"
                + job.getId() + "/" + fileName;
            String storedKey = storageClient.putObject(
                objectKey,
                new ByteArrayInputStream(archive),
                archive.length,
                "application/zip"
            );
            LocalDateTime expireAt = LocalDateTime.now().plusDays(retentionDays);
            exportJobMapper.markSuccess(job.getId(), storedKey, archive.length, expireAt);
            if (task != null) {
                taskMapper.markSuccess(
                    task.getId(), job.getTenantId(), job.getCreateBy(),
                    JsonUtils.toJson(Map.of("exportJobId", job.getId(), "storageKey", storedKey))
                );
            }
            notificationService.sendOnce(
                job.getTenantId(), job.getCreateBy(), "system", "batch_export", String.valueOf(job.getId()),
                "批量下载已准备完成",
                String.format("%s 已打包完成，共 %d 条脚本，可在任务中心下载。", fileName, scripts.size())
            );
        } catch (Exception exception) {
            String errorMessage = truncate(StringUtils.hasText(exception.getMessage())
                ? exception.getMessage()
                : "批量下载处理失败");
            exportJobMapper.markFailed(job.getId(), errorMessage);
            if (task != null) {
                taskMapper.markFailed(task.getId(), job.getTenantId(), job.getCreateBy(), "EXPORT_FAILED", errorMessage);
            }
            notificationService.sendOnce(
                job.getTenantId(), job.getCreateBy(), "system", "batch_export_failed", String.valueOf(job.getId()),
                "批量下载处理失败", errorMessage
            );
            log.error("批量导出任务失败，exportJobId={}", exportJobId, exception);
        } finally {
            if (task != null) taskQuotaService.release(task.getQuotaRequestNo());
        }
    }

    private ExportCreateDTO readRequest(AiGenerationTask task) throws Exception {
        if (task == null || !StringUtils.hasText(task.getInputPayload())) return new ExportCreateDTO();
        return objectMapper.readValue(task.getInputPayload(), ExportCreateDTO.class);
    }

    private List<AiStoryboardScript> loadScripts(AiExportJob job, ExportCreateDTO request) {
        List<Integer> requestedIds = parseIds(request.scriptIds);
        LambdaQueryWrapper<AiStoryboardScript> wrapper = new LambdaQueryWrapper<AiStoryboardScript>()
            .eq(AiStoryboardScript::getTenantId, job.getTenantId())
            .eq(AiStoryboardScript::getCreateBy, job.getCreateBy());
        if (!requestedIds.isEmpty()) {
            wrapper.in(AiStoryboardScript::getId, requestedIds);
        } else if (job.getProjectId() != null) {
            wrapper.eq(AiStoryboardScript::getProjectId, job.getProjectId());
        } else {
            throw new IllegalStateException("请选择需要下载的脚本");
        }
        List<AiStoryboardScript> found = scriptMapper.selectList(wrapper);
        if (requestedIds.isEmpty()) return found;
        Map<Integer, AiStoryboardScript> byId = new LinkedHashMap<>();
        found.forEach(script -> byId.put(script.getId(), script));
        return requestedIds.stream().distinct().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }

    private List<Integer> parseIds(List<String> values) {
        if (values == null) return List.of();
        List<Integer> ids = new ArrayList<>();
        for (String value : values) {
            try {
                if (StringUtils.hasText(value)) ids.add(Integer.valueOf(value));
            } catch (NumberFormatException ignored) {
                // Invalid IDs are ignored; an empty result is handled as a failed export.
            }
        }
        return ids;
    }

    private String zipFileName(String value) {
        String name = StringUtils.hasText(value) ? value.trim() : "脚本批量下载.zip";
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-");
        if (name.toLowerCase().endsWith(".zip")) return name;
        int extensionIndex = name.lastIndexOf('.');
        if (extensionIndex > 0) name = name.substring(0, extensionIndex);
        return name + ".zip";
    }

    private String truncate(String value) {
        return value.length() <= ERROR_MESSAGE_LIMIT ? value : value.substring(0, ERROR_MESSAGE_LIMIT);
    }
}
