package com.aiscript.task.parser;

import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.source.service.SourceAnalysisService;
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

    public VideoParseTask(SourceAnalysisService sourceAnalysisService, AiGenerationTaskMapper taskMapper) {
        this.sourceAnalysisService = sourceAnalysisService;
        this.taskMapper = taskMapper;
    }

    @Async("aiTaskExecutor")
    public void run(Integer taskId) {
        log.info("Run video parse task: {}", taskId);
        try {
            sourceAnalysisService.executeParseTask(taskId);
        } catch (Exception ex) {
            log.error("Video parse task failed: {}", taskId, ex);
            markFailed(taskId, ex.getMessage());
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
