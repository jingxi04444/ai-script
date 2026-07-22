package com.aiscript.task.generation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class ScriptGenerationTask {
    private static final Logger log = LoggerFactory.getLogger(ScriptGenerationTask.class);

    @Async("aiTaskExecutor")
    public void run(Integer taskId) {
        log.info("Run script generation task: {}", taskId);
    }
}
