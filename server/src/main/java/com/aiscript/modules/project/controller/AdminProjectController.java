package com.aiscript.modules.project.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.project.dto.ProjectQueryDTO;
import com.aiscript.modules.project.service.ProjectService;
import com.aiscript.modules.project.vo.ProjectVO;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/projects")
public class AdminProjectController {
    private final ProjectService projectService;

    public AdminProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public R<PageResult<ProjectVO>> list(ProjectQueryDTO query) {
        return R.ok(projectService.page(query, true));
    }

    @GetMapping("/{id}")
    public R<ProjectVO> getById(@PathVariable Integer id) {
        return R.ok(projectService.getById(id));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        projectService.delete(id);
        return R.ok();
    }
}
