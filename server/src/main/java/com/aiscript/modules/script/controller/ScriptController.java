package com.aiscript.modules.script.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.script.dto.ScriptSaveDTO;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.PolishScriptVO;
import com.aiscript.modules.script.vo.ScriptListVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scripts")
public class ScriptController {
    private final ScriptService scriptService;

    public ScriptController(ScriptService scriptService) {
        this.scriptService = scriptService;
    }

    @GetMapping
    public R<List<ScriptVO>> list(@RequestParam Integer projectId) {
        return R.ok(scriptService.list(projectId));
    }

    @GetMapping("/page")
    public R<PageResult<ScriptListVO>> page(
        @Valid PageQuery query,
        @RequestParam Integer projectId,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String sortBy
    ) {
        return R.ok(sortBy == null
            ? scriptService.page(query, projectId, type, status)
            : scriptService.page(query, projectId, type, status, sortBy));
    }

    @GetMapping("/mine")
    public R<List<ScriptVO>> mineList() {
        return R.ok(scriptService.mineList());
    }

    @GetMapping("/{id}")
    public R<ScriptVO> getById(@PathVariable Integer id) {
        return R.ok(scriptService.getById(id));
    }

    @PostMapping("/generate")
    public R<ScriptVO> generate(@RequestBody GenerateScriptDTO payload) {
        return R.ok(scriptService.generate(payload));
    }

    @PostMapping("/{id}/polish")
    public R<PolishScriptVO> polish(@PathVariable Integer id, @Valid @RequestBody PolishScriptDTO payload) {
        return R.ok(scriptService.polish(id, payload));
    }

    @PutMapping("/{id}")
    public R<ScriptVO> update(@PathVariable Integer id, @RequestBody ScriptSaveDTO payload) {
        return R.ok(scriptService.update(id, payload));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        scriptService.delete(id);
        return R.ok();
    }

    @GetMapping("/templates")
    public R<List<ScriptTemplateVO>> templates() {
        return R.ok(scriptService.enabledTemplates());
    }
}
