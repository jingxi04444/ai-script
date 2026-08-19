package com.aiscript.modules.project.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.project.dto.ShareLinkCreateDTO;
import com.aiscript.modules.project.service.ProjectCollaborationService;
import com.aiscript.modules.project.vo.ShareLinkVO;
import com.aiscript.modules.project.vo.ProjectCollaborationOverviewVO;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ProjectCollaborationController {
    private final ProjectCollaborationService service;

    public ProjectCollaborationController(ProjectCollaborationService service) { this.service = service; }

    @GetMapping("/projects/{projectId}/collaboration")
    public R<ProjectCollaborationOverviewVO> overview(@PathVariable Integer projectId) {
        return R.ok(service.overview(projectId));
    }

    @PostMapping("/projects/{projectId}/collaboration-links")
    public R<ShareLinkVO> create(@PathVariable Integer projectId, @RequestBody(required = false) ShareLinkCreateDTO dto) {
        return R.ok(service.createLink(projectId, dto));
    }

    @PostMapping("/project-collaboration/{token}/join")
    public R<Map<String, String>> join(@PathVariable String token) {
        return R.ok(Map.of("projectId", service.join(token)));
    }

    @DeleteMapping("/projects/{projectId}/collaboration-links/{linkId}")
    public R<Void> revoke(@PathVariable Integer projectId, @PathVariable Integer linkId) {
        service.revokeLink(projectId, linkId);
        return R.ok();
    }

    @DeleteMapping("/projects/{projectId}/collaborators/{userId}")
    public R<Void> removeCollaborator(@PathVariable Integer projectId, @PathVariable Integer userId) {
        service.removeCollaborator(projectId, userId);
        return R.ok();
    }
}
