package com.aiscript.modules.project.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.project.dto.ProjectStepSaveDTO;
import com.aiscript.modules.project.service.ProjectStepService;
import com.aiscript.modules.project.vo.ProjectStepVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/steps")
public class ProjectStepController {
    private final ProjectStepService projectStepService;

    public ProjectStepController(ProjectStepService projectStepService) {
        this.projectStepService = projectStepService;
    }

    @GetMapping
    public R<List<ProjectStepVO>> list(@PathVariable Integer projectId) {
        return R.ok(projectStepService.list(projectId));
    }

    @PostMapping
    public R<ProjectStepVO> create(@PathVariable Integer projectId, @RequestBody ProjectStepSaveDTO dto) {
        return R.ok(projectStepService.save(projectId, null, dto));
    }

    @PutMapping("/{id}")
    public R<ProjectStepVO> update(@PathVariable Integer projectId, @PathVariable Integer id, @RequestBody ProjectStepSaveDTO dto) {
        return R.ok(projectStepService.save(projectId, id, dto));
    }

    @PostMapping("/{id}/complete")
    public R<ProjectStepVO> complete(@PathVariable Integer projectId, @PathVariable Integer id) {
        return R.ok(projectStepService.complete(projectId, id));
    }

    @PostMapping("/{id}/reopen")
    public R<ProjectStepVO> reopen(@PathVariable Integer projectId, @PathVariable Integer id) {
        return R.ok(projectStepService.reopen(projectId, id));
    }
}
