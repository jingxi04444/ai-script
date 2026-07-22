package com.aiscript.modules.storyboard.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.storyboard.dto.StoryboardUpdateDTO;
import com.aiscript.modules.storyboard.service.StoryboardService;
import com.aiscript.modules.storyboard.vo.StoryboardVO;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/storyboards")
public class StoryboardController {
    private final StoryboardService storyboardService;

    public StoryboardController(StoryboardService storyboardService) {
        this.storyboardService = storyboardService;
    }

    @GetMapping
    public R<StoryboardVO> getByScriptId(@RequestParam Integer scriptId) {
        return R.ok(storyboardService.getByScriptId(scriptId));
    }

    @GetMapping("/{id}")
    public R<StoryboardVO> getById(@PathVariable Integer id) {
        return R.ok(storyboardService.getById(id));
    }

    @PutMapping("/{id}")
    public R<StoryboardVO> update(@PathVariable Integer id, @RequestBody StoryboardUpdateDTO payload) {
        return R.ok(storyboardService.update(id, payload));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> export(@PathVariable Integer id) {
        byte[] content = storyboardService.exportCsv(id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"storyboard.csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(content);
    }

}
