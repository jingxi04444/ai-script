package com.aiscript.modules.script.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.TemplateSaveDTO;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
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
@RequestMapping("/api/admin/templates")
public class AdminTemplateController {
    private final ScriptService scriptService;

    public AdminTemplateController(ScriptService scriptService) {
        this.scriptService = scriptService;
    }

    @GetMapping
    public R<PageResult<ScriptTemplateVO>> list(
        PageQuery query,
        @RequestParam(required = false) String category
    ) {
        return R.ok(scriptService.templatePage(query, category));
    }

    @GetMapping("/{id}")
    public R<ScriptTemplateVO> getById(@PathVariable Integer id) {
        return R.ok(scriptService.templateById(id));
    }

    @PostMapping
    public R<ScriptTemplateVO> create(@RequestBody TemplateSaveDTO payload) {
        return R.ok(scriptService.createTemplate(payload));
    }

    @PutMapping("/{id}")
    public R<ScriptTemplateVO> update(@PathVariable Integer id, @RequestBody TemplateSaveDTO payload) {
        return R.ok(scriptService.updateTemplate(id, payload));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        scriptService.deleteTemplate(id);
        return R.ok();
    }
}
