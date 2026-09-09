package com.aiscript.modules.workflow.event;

import com.aiscript.modules.workflow.vo.WorkflowRunEventVO;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class WorkflowRunEventBroker {
    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long runId, WorkflowRunEventVO initialEvent) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitters.computeIfAbsent(runId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable cleanup = () -> remove(runId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(ignored -> cleanup.run());
        try {
            emitter.send(SseEmitter.event().name("workflow").data(initialEvent));
            if (isTerminal(initialEvent)) {
                emitter.complete();
                remove(runId, emitter);
            }
        } catch (IOException exception) {
            remove(runId, emitter);
            emitter.completeWithError(exception);
        }
        return emitter;
    }

    public void publish(WorkflowRunEventVO event) {
        if (event.getRunId() == null) return;
        Long runId;
        try {
            runId = Long.valueOf(event.getRunId());
        } catch (NumberFormatException exception) {
            return;
        }
        List<SseEmitter> subscribers = emitters.getOrDefault(runId, new CopyOnWriteArrayList<>());
        boolean terminal = isTerminal(event);
        for (SseEmitter emitter : subscribers) {
            try {
                emitter.send(SseEmitter.event().name("workflow").data(event));
                if (terminal) emitter.complete();
            } catch (IOException exception) {
                remove(runId, emitter);
            }
        }
        if (terminal) emitters.remove(runId);
    }

    private void remove(Long runId, SseEmitter emitter) {
        List<SseEmitter> subscribers = emitters.get(runId);
        if (subscribers == null) return;
        subscribers.remove(emitter);
        if (subscribers.isEmpty()) emitters.remove(runId);
    }

    private boolean isTerminal(WorkflowRunEventVO event) {
        return "WORKFLOW_COMPLETED".equals(event.getType())
            || "WORKFLOW_FAILED".equals(event.getType())
            || "WORKFLOW_CANCELED".equals(event.getType());
    }
}
