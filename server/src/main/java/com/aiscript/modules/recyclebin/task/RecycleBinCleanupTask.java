package com.aiscript.modules.recyclebin.task;

import com.aiscript.modules.recyclebin.service.RecycleBinService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RecycleBinCleanupTask {
    private final RecycleBinService recycleBinService;

    public RecycleBinCleanupTask(RecycleBinService recycleBinService) {
        this.recycleBinService = recycleBinService;
    }

    @Scheduled(cron = "${aiscript.recycle-bin.cleanup-cron:0 20 3 * * ?}")
    public void cleanup() {
        int cleaned = recycleBinService.cleanupExpired();
        if (cleaned > 0) log.info("Recycle bin cleanup completed: {} item(s) purged", cleaned);
    }
}
