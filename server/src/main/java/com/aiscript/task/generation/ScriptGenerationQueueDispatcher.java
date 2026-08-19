package com.aiscript.task.generation;

import com.aiscript.modules.generation.entity.AiScriptGenerationQueueItem;
import com.aiscript.modules.generation.mapper.AiScriptGenerationQueueItemMapper;
import com.aiscript.modules.generation.service.impl.ScriptGenerationQueueServiceImpl;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ScriptGenerationQueueDispatcher {
    private static final int OWNER_SCAN_LIMIT = 100;

    private final AiScriptGenerationQueueItemMapper queueMapper;
    private final ScriptGenerationQueueServiceImpl queueService;
    private final QueuedScriptGenerationTask worker;

    public ScriptGenerationQueueDispatcher(
        AiScriptGenerationQueueItemMapper queueMapper,
        ScriptGenerationQueueServiceImpl queueService,
        QueuedScriptGenerationTask worker
    ) {
        this.queueMapper = queueMapper;
        this.queueService = queueService;
        this.worker = worker;
    }

    @Scheduled(fixedDelayString = "${ai.script-queue.dispatch-delay-ms:1000}")
    public void dispatch() {
        List<AiScriptGenerationQueueItem> owners = queueMapper.selectPendingOwners(OWNER_SCAN_LIMIT);
        for (AiScriptGenerationQueueItem owner : owners) {
            try {
                dispatchOwner(owner.getTenantId(), owner.getCreateBy());
            } catch (RuntimeException exception) {
                log.error("脚本生成队列调度失败，tenantId={} userId={}", owner.getTenantId(), owner.getCreateBy(), exception);
            }
        }
    }

    @Scheduled(fixedDelayString = "${ai.script-queue.recovery-delay-ms:60000}")
    public void failStaleTasks() {
        int failed = queueMapper.markStaleRunningFailed(LocalDateTime.now().minusMinutes(30));
        if (failed > 0) log.warn("已将 {} 个超时脚本生成任务标记为失败", failed);
    }

    private void dispatchOwner(Integer tenantId, Integer userId) {
        int concurrency = queueService.configuredConcurrency(tenantId, userId);
        int available = concurrency - queueMapper.countRunning(tenantId, userId);
        if (available <= 0) return;
        for (Long id : queueMapper.selectPendingIds(tenantId, userId, available)) {
            if (queueMapper.markRunning(id) == 1) {
                try {
                    worker.run(id);
                } catch (RuntimeException rejected) {
                    queueMapper.returnToPending(id);
                    throw rejected;
                }
            }
        }
    }
}
