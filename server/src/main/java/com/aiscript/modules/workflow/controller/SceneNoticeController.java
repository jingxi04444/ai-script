package com.aiscript.modules.workflow.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.workflow.dto.SceneNoticeSaveDTO;
import com.aiscript.modules.workflow.service.SceneNoticeService;
import com.aiscript.modules.workflow.vo.SceneNoticeVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/scene-notice")
public class SceneNoticeController {
    private final SceneNoticeService sceneNoticeService;

    public SceneNoticeController(SceneNoticeService sceneNoticeService) {
        this.sceneNoticeService = sceneNoticeService;
    }

    @GetMapping
    public R<SceneNoticeVO> get(@PathVariable Integer projectId) {
        return R.ok(sceneNoticeService.get(projectId));
    }

    @PostMapping("/preview")
    public R<SceneNoticeVO> preview(@PathVariable Integer projectId, @RequestBody SceneNoticeSaveDTO dto) {
        return R.ok(sceneNoticeService.preview(projectId, dto));
    }

    @PutMapping
    public R<SceneNoticeVO> save(@PathVariable Integer projectId, @RequestBody SceneNoticeSaveDTO dto) {
        return R.ok(sceneNoticeService.save(projectId, dto));
    }
}
