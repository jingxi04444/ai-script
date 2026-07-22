package com.aiscript.modules.generation.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.generation.service.GenerationTaskService;
import com.aiscript.modules.generation.vo.GenerationTaskVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class GenerationTaskController {
    private final GenerationTaskService generationTaskService;

    public GenerationTaskController(GenerationTaskService generationTaskService) {
        this.generationTaskService = generationTaskService;
    }

    @GetMapping("/{id}")
    public R<GenerationTaskVO> getById(@PathVariable Integer id) {
        return R.ok(generationTaskService.getById(id));
    }
}
