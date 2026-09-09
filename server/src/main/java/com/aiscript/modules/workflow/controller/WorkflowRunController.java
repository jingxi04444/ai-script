package com.aiscript.modules.workflow.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.workflow.dto.WorkflowRunCreateDTO;
import com.aiscript.modules.workflow.event.WorkflowRunEventBroker;
import com.aiscript.modules.workflow.service.WorkflowRunService;
import com.aiscript.modules.workflow.vo.WorkflowRunEventVO;
import com.aiscript.modules.workflow.vo.WorkflowRunVO;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/projects/{projectId}/workflow/runs")
public class WorkflowRunController {
    private final WorkflowRunService runService;
    private final WorkflowRunEventBroker eventBroker;

    public WorkflowRunController(WorkflowRunService runService, WorkflowRunEventBroker eventBroker) {
        this.runService = runService;
        this.eventBroker = eventBroker;
    }

    @PostMapping
    public R<WorkflowRunVO> start(
        @PathVariable Integer projectId,
        @Valid @RequestBody WorkflowRunCreateDTO dto
    ) {
        return R.ok(runService.start(projectId, dto));
    }

    @GetMapping("/{runId}")
    public R<WorkflowRunVO> get(@PathVariable Integer projectId, @PathVariable Long runId) {
        return R.ok(runService.get(projectId, runId));
    }

    @PostMapping("/{runId}/cancel")
    public R<WorkflowRunVO> cancel(@PathVariable Integer projectId, @PathVariable Long runId) {
        return R.ok(runService.cancel(projectId, runId));
    }

    @PostMapping("/{runId}/retry")
    public R<WorkflowRunVO> retry(@PathVariable Integer projectId, @PathVariable Long runId) {
        return R.ok(runService.retry(projectId, runId));
    }

    @GetMapping(value = "/{runId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@PathVariable Integer projectId, @PathVariable Long runId) {
        WorkflowRunVO run = runService.get(projectId, runId);
        WorkflowRunEventVO initial = new WorkflowRunEventVO();
        initial.setType(switch (run.getStatus()) {
            case "success" -> "WORKFLOW_COMPLETED";
            case "failed" -> "WORKFLOW_FAILED";
            case "canceled" -> "WORKFLOW_CANCELED";
            default -> "SNAPSHOT";
        });
        initial.setRunId(run.getId());
        initial.setStatus(run.getStatus());
        initial.setProgress(run.getProgress());
        return eventBroker.subscribe(runId, initial);
    }
}
