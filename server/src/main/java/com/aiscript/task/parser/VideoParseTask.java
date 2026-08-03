package com.aiscript.task.parser;

import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.membership.service.MembershipTaskQuotaService;
import com.aiscript.modules.source.service.SourceAnalysisService;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class VideoParseTask {
    private static final Logger log = LoggerFactory.getLogger(VideoParseTask.class);
    private final SourceAnalysisService sourceAnalysisService;
    private final AiGenerationTaskMapper taskMapper;
    private final MembershipTaskQuotaService taskQuotaService;

    public VideoParseTask(
        SourceAnalysisService sourceAnalysisService,
        AiGenerationTaskMapper taskMapper,
        MembershipTaskQuotaService taskQuotaService
    ) {
        this.sourceAnalysisService = sourceAnalysisService;
        this.taskMapper = taskMapper;
        this.taskQuotaService = taskQuotaService;
    }

    @Async("aiTaskExecutor")
    public void run(Integer taskId) {
        log.info("Run video parse task: {}", taskId);
        try {
            sourceAnalysisService.executeParseTask(taskId);
        } catch (Exception ex) {
            log.error("Video parse task failed: {}", taskId, ex);
            markFailed(taskId, ex.getMessage());
        } finally {
            releaseTaskQuota(taskId);
        }
    }

    private void releaseTaskQuota(Integer taskId) {
        AiGenerationTask task = taskMapper.selectById(taskId);
        if (task == null || task.getQuotaRequestNo() == null || task.getQuotaRequestNo().isBlank()) {
            return;
        }
        String requestNo = task.getQuotaRequestNo();
        try {
            taskQuotaService.release(requestNo);
            taskMapper.update(null, new LambdaUpdateWrapper<AiGenerationTask>()
                .eq(AiGenerationTask::getId, taskId)
                .eq(AiGenerationTask::getQuotaRequestNo, requestNo)
                .set(AiGenerationTask::getQuotaRequestNo, null));
        } catch (RuntimeException exception) {
            log.warn("Release video parse task quota failed: taskId={}, requestNo={}",
                taskId, requestNo, exception);
        }
    }

    private void markFailed(Integer taskId, String message) {
        AiGenerationTask task = taskMapper.selectById(taskId);
        if (task == null || "success".equals(task.getStatus())) {
            return;
        }
        task.setStatus("failed");
        task.setProgress(100);
        task.setErrorCode("PARSE_VIDEO_FAILED");
        task.setErrorMessage(message == null || message.isBlank() ? "视频解析任务执行失败" : message);
        task.setFinishTime(LocalDateTime.now());
        taskMapper.updateById(task);
    }
}
