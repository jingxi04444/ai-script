package com.aiscript.task.export;

import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.generation.entity.AiExportJob;
import com.aiscript.modules.generation.mapper.AiExportJobMapper;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ExportCleanupTask {
    private final AiExportJobMapper exportJobMapper;
    private final StorageClient storageClient;

    public ExportCleanupTask(AiExportJobMapper exportJobMapper, StorageClient storageClient) {
        this.exportJobMapper = exportJobMapper;
        this.storageClient = storageClient;
    }

    @Scheduled(cron = "${aiscript.exports.cleanup-cron:0 40 3 * * ?}")
    public void cleanupExpiredFiles() {
        List<AiExportJob> jobs = exportJobMapper.selectExpired(200);
        int cleaned = 0;
        for (AiExportJob job : jobs) {
            try {
                storageClient.deleteObject(job.getStorageKey());
                if (exportJobMapper.markExpired(job.getId()) == 1) cleaned += 1;
            } catch (RuntimeException exception) {
                log.error("过期导出文件清理失败，exportJobId={}", job.getId(), exception);
            }
        }
        if (cleaned > 0) log.info("已清理 {} 个过期导出文件", cleaned);
    }
}
