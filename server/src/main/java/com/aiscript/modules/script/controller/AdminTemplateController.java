package com.aiscript.modules.script.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.TemplateSaveDTO;
import com.aiscript.modules.script.dto.TemplateStateDTO;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.AdminScriptTemplateVO;
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
    public R<PageResult<AdminScriptTemplateVO>> list(
        PageQuery query,
        @RequestParam(required = false) String category
    ) {
        return R.ok(scriptService.templatePage(query, category));
    }

    @GetMapping("/{id}")
    public R<AdminScriptTemplateVO> getById(@PathVariable Integer id) {
        return R.ok(scriptService.templateById(id));
    }

    @PostMapping
    public R<AdminScriptTemplateVO> create(@RequestBody TemplateSaveDTO payload) {
        ScriptTemplateVO created = scriptService.createTemplate(payload);
        return R.ok(scriptService.templateById(Integer.valueOf(created.getId())));
    }

    @PutMapping("/{id}")
    public R<AdminScriptTemplateVO> update(@PathVariable Integer id, @RequestBody TemplateSaveDTO payload) {
        scriptService.updateTemplate(id, payload);
        return R.ok(scriptService.templateById(id));
    }

    @PutMapping("/{id}/state")
    public R<AdminScriptTemplateVO> updateState(@PathVariable Integer id, @RequestBody TemplateStateDTO payload) {
        scriptService.updateTemplateState(id, payload);
        return R.ok(scriptService.templateById(id));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        scriptService.deleteTemplate(id);
        return R.ok();
    }
}
