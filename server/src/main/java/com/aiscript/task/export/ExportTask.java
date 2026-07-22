package com.aiscript.task.export;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class ExportTask {
    private static final Logger log = LoggerFactory.getLogger(ExportTask.class);

    @Async("aiTaskExecutor")
    public void run(Integer taskId) {
        log.info("Run export task: {}", taskId);
    }
}
