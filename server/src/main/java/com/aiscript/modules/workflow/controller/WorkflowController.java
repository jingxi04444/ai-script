package com.aiscript.modules.workflow.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.workflow.dto.WorkflowSaveDTO;
import com.aiscript.modules.workflow.dto.WorkflowValidateDTO;
import com.aiscript.modules.workflow.service.WorkflowService;
import com.aiscript.modules.workflow.vo.WorkflowVO;
import com.aiscript.modules.workflow.vo.WorkflowValidationVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/workflow")
public class WorkflowController {
    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @GetMapping
    public R<WorkflowVO> get(
        @PathVariable Integer projectId,
        @RequestParam(defaultValue = "video") String mode
    ) {
        return R.ok(workflowService.get(projectId, mode));
    }

    @PutMapping
    public R<WorkflowVO> save(
        @PathVariable Integer projectId,
        @Valid @RequestBody WorkflowSaveDTO dto
    ) {
        return R.ok(workflowService.save(projectId, dto));
    }

    @PostMapping("/validate")
    public R<WorkflowValidationVO> validate(
        @PathVariable Integer projectId,
        @Valid @RequestBody WorkflowValidateDTO dto
    ) {
        return R.ok(workflowService.validate(dto.getGraphJson()));
    }
}
