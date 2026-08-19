package com.aiscript.modules.script.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.generation.dto.ScriptQueueConcurrencyDTO;
import com.aiscript.modules.generation.service.ScriptGenerationQueueService;
import com.aiscript.modules.generation.vo.ScriptQueueItemVO;
import com.aiscript.modules.generation.vo.ScriptQueueStateVO;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.script.dto.ScriptSaveDTO;
import com.aiscript.modules.script.dto.TemplateSaveDTO;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.PolishScriptVO;
import com.aiscript.modules.script.vo.ScriptListVO;
import com.aiscript.modules.script.vo.ScriptPolishMessageVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.script.vo.ScriptVersionVO;
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
    private final ScriptGenerationQueueService scriptGenerationQueueService;

    public ScriptController(
        ScriptService scriptService,
        ScriptGenerationQueueService scriptGenerationQueueService
    ) {
        this.scriptService = scriptService;
        this.scriptGenerationQueueService = scriptGenerationQueueService;
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
    public R<ScriptVO> generate(@Valid @RequestBody GenerateScriptDTO payload) {
        return R.ok(scriptService.generate(payload));
    }

    @PostMapping("/generation-queue")
    public R<ScriptQueueItemVO> enqueueGeneration(@Valid @RequestBody GenerateScriptDTO payload) {
        return R.ok(scriptGenerationQueueService.enqueue(payload));
    }

    @GetMapping("/generation-queue")
    public R<ScriptQueueStateVO> generationQueue() {
        return R.ok(scriptGenerationQueueService.state());
    }

    @PutMapping("/generation-queue/concurrency")
    public R<ScriptQueueStateVO> updateGenerationQueueConcurrency(
        @Valid @RequestBody ScriptQueueConcurrencyDTO payload
    ) {
        return R.ok(scriptGenerationQueueService.updateConcurrency(payload.getConcurrency()));
    }

    @DeleteMapping("/generation-queue/{id}")
    public R<Void> cancelGenerationQueueItem(@PathVariable Long id) {
        scriptGenerationQueueService.cancel(id);
        return R.ok();
    }

    @PostMapping("/{id}/polish")
    public R<PolishScriptVO> polish(@PathVariable Integer id, @Valid @RequestBody PolishScriptDTO payload) {
        return R.ok(scriptService.polish(id, payload));
    }

    @GetMapping("/{id}/polish-messages")
    public R<List<ScriptPolishMessageVO>> polishMessages(@PathVariable Integer id) {
        return R.ok(scriptService.polishMessages(id));
    }

    @GetMapping("/{id}/versions")
    public R<List<ScriptVersionVO>> versions(@PathVariable Integer id) {
        return R.ok(scriptService.versions(id));
    }

    @PostMapping("/{id}/versions/{versionId}/restore")
    public R<ScriptVO> restoreVersion(@PathVariable Integer id, @PathVariable Integer versionId) {
        return R.ok(scriptService.restoreVersion(id, versionId));
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

    @PostMapping("/templates")
    public R<ScriptTemplateVO> createCustomTemplate(@RequestBody TemplateSaveDTO payload) {
        return R.ok(scriptService.createTemplate(payload));
    }
}
