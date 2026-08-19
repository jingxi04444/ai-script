package com.aiscript.modules.project.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.project.dto.ProjectCreateDTO;
import com.aiscript.modules.project.dto.ProjectQueryDTO;
import com.aiscript.modules.project.dto.ProjectUpdateDTO;
import com.aiscript.modules.project.service.ProjectService;
import com.aiscript.modules.project.vo.ProjectVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public R<PageResult<ProjectVO>> list(ProjectQueryDTO query) {
        return R.ok(projectService.page(query, false));
    }

    @GetMapping("/{id}")
    public R<ProjectVO> getById(@PathVariable Integer id) {
        return R.ok(projectService.getById(id));
    }

    @PostMapping
    public R<ProjectVO> create(@Valid @RequestBody ProjectCreateDTO payload) {
        return R.ok(projectService.create(payload));
    }

    @PutMapping("/{id}")
    public R<ProjectVO> update(@PathVariable Integer id, @RequestBody ProjectUpdateDTO payload) {
        return R.ok(projectService.update(id, payload));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        projectService.delete(id);
        return R.ok();
    }
}
