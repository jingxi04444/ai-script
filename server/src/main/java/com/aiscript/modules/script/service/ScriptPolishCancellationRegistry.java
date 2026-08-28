package com.aiscript.modules.script.service;

import com.aiscript.common.exception.BusinessException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;

@Component
public class ScriptPolishCancellationRegistry {
    private static final long CANCELLATION_TOMBSTONE_TTL_MS = 5 * 60 * 1000L;
    private final ConcurrentMap<OperationKey, ActiveOperation> operations = new ConcurrentHashMap<>();

    public void register(Integer tenantId, Integer userId, Integer scriptId, String requestNo) {
        pruneExpiredCancellations();
        OperationKey key = new OperationKey(tenantId, userId, scriptId, requestNo);
        operations.compute(key, (ignored, current) -> {
            ActiveOperation operation = current == null ? new ActiveOperation() : current;
            operation.worker = Thread.currentThread();
            return operation;
        });
        throwIfCancelled(tenantId, userId, scriptId, requestNo);
    }

    public void cancel(Integer tenantId, Integer userId, Integer scriptId, String requestNo) {
        pruneExpiredCancellations();
        OperationKey key = new OperationKey(tenantId, userId, scriptId, requestNo);
        operations.compute(key, (ignored, current) -> {
            ActiveOperation operation = current == null ? new ActiveOperation() : current;
            operation.cancelled = true;
            if (operation.worker != null) operation.worker.interrupt();
            return operation;
        });
    }

    public void throwIfCancelled(Integer tenantId, Integer userId, Integer scriptId, String requestNo) {
        ActiveOperation operation = operations.get(new OperationKey(tenantId, userId, scriptId, requestNo));
        if ((operation != null && operation.cancelled) || Thread.currentThread().isInterrupted()) {
            throw new BusinessException("AI 修改已停止");
        }
    }

    public void clear(Integer tenantId, Integer userId, Integer scriptId, String requestNo) {
        OperationKey key = new OperationKey(tenantId, userId, scriptId, requestNo);
        operations.computeIfPresent(key, (ignored, operation) -> (
            operation.worker == null || operation.worker == Thread.currentThread() ? null : operation
        ));
        Thread.interrupted();
    }

    private void pruneExpiredCancellations() {
        long deadline = System.currentTimeMillis() - CANCELLATION_TOMBSTONE_TTL_MS;
        operations.entrySet().removeIf(entry -> (
            entry.getValue().worker == null && entry.getValue().createdAt < deadline
        ));
    }

    private record OperationKey(Integer tenantId, Integer userId, Integer scriptId, String requestNo) {
    }

    private static final class ActiveOperation {
        private final long createdAt = System.currentTimeMillis();
        private volatile Thread worker;
        private volatile boolean cancelled;
    }
}
