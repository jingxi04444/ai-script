package com.aiscript.modules.system.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.system.dto.ImportTemplateSaveDTO;
import com.aiscript.modules.system.dto.PermissionSaveDTO;
import com.aiscript.modules.system.dto.PromptTemplateSaveDTO;
import com.aiscript.modules.system.dto.RolePermissionDTO;
import com.aiscript.modules.system.dto.RoleSaveDTO;
import com.aiscript.modules.system.dto.ScriptFormatSaveDTO;
import com.aiscript.modules.system.dto.UserRoleDTO;
import com.aiscript.modules.system.service.SystemManagementService;
import com.aiscript.modules.system.vo.ImportTemplateVO;
import com.aiscript.modules.system.vo.PermissionVO;
import com.aiscript.modules.system.vo.PromptTemplateVO;
import com.aiscript.modules.system.vo.RoleVO;
import com.aiscript.modules.system.vo.ScriptFormatVO;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/system")
public class AdminSystemManagementController {
    private final SystemManagementService systemManagementService;

    public AdminSystemManagementController(SystemManagementService systemManagementService) {
        this.systemManagementService = systemManagementService;
    }

    @GetMapping("/prompt-templates")
    public R<PageResult<PromptTemplateVO>> promptTemplates(PageQuery query, @RequestParam(required = false) String sceneCode) {
        return R.ok(systemManagementService.promptPage(query, sceneCode));
    }

    @PostMapping("/prompt-templates")
    public R<PromptTemplateVO> createPrompt(@RequestBody PromptTemplateSaveDTO dto) {
        return R.ok(systemManagementService.savePrompt(null, dto));
    }

    @PutMapping("/prompt-templates/{id}")
    public R<PromptTemplateVO> updatePrompt(@PathVariable Integer id, @RequestBody PromptTemplateSaveDTO dto) {
        return R.ok(systemManagementService.savePrompt(id, dto));
    }

    @DeleteMapping("/prompt-templates/{id}")
    public R<Void> deletePrompt(@PathVariable Integer id) {
        systemManagementService.deletePrompt(id);
        return R.ok();
    }

    @GetMapping("/import-templates")
    public R<PageResult<ImportTemplateVO>> importTemplates(PageQuery query, @RequestParam(required = false) String templateType) {
        return R.ok(systemManagementService.importTemplatePage(query, templateType));
    }

    @PostMapping("/import-templates")
    public R<ImportTemplateVO> createImportTemplate(@RequestBody ImportTemplateSaveDTO dto) {
        return R.ok(systemManagementService.saveImportTemplate(null, dto));
    }

    @PutMapping("/import-templates/{id}")
    public R<ImportTemplateVO> updateImportTemplate(@PathVariable Integer id, @RequestBody ImportTemplateSaveDTO dto) {
        return R.ok(systemManagementService.saveImportTemplate(id, dto));
    }

    @PostMapping("/import-templates/{id}/file")
    public R<ImportTemplateVO> uploadImportTemplateFile(@PathVariable Integer id, @RequestParam("file") MultipartFile file) {
        return R.ok(systemManagementService.uploadImportTemplateFile(id, file));
    }

    @DeleteMapping("/import-templates/{id}")
    public R<Void> deleteImportTemplate(@PathVariable Integer id) {
        systemManagementService.deleteImportTemplate(id);
        return R.ok();
    }

    @GetMapping("/script-formats")
    public R<PageResult<ScriptFormatVO>> scriptFormats(PageQuery query, @RequestParam(required = false) Integer status) {
        return R.ok(systemManagementService.scriptFormatPage(query, status));
    }

    @PostMapping("/script-formats")
    public R<ScriptFormatVO> createScriptFormat(@RequestBody ScriptFormatSaveDTO dto) {
        return R.ok(systemManagementService.saveScriptFormat(null, dto));
    }

    @PutMapping("/script-formats/{id}")
    public R<ScriptFormatVO> updateScriptFormat(@PathVariable Integer id, @RequestBody ScriptFormatSaveDTO dto) {
        return R.ok(systemManagementService.saveScriptFormat(id, dto));
    }

    @DeleteMapping("/script-formats/{id}")
    public R<Void> deleteScriptFormat(@PathVariable Integer id) {
        systemManagementService.deleteScriptFormat(id);
        return R.ok();
    }

    @GetMapping("/roles")
    public R<PageResult<RoleVO>> roles(PageQuery query) {
        return R.ok(systemManagementService.rolePage(query));
    }

    @PostMapping("/roles")
    public R<RoleVO> createRole(@RequestBody RoleSaveDTO dto) {
        return R.ok(systemManagementService.saveRole(null, dto));
    }

    @PutMapping("/roles/{id}")
    public R<RoleVO> updateRole(@PathVariable Integer id, @RequestBody RoleSaveDTO dto) {
        return R.ok(systemManagementService.saveRole(id, dto));
    }

    @DeleteMapping("/roles/{id}")
    public R<Void> deleteRole(@PathVariable Integer id) {
        systemManagementService.deleteRole(id);
        return R.ok();
    }

    @PutMapping("/roles/{id}/permissions")
    public R<Void> assignRolePermissions(@PathVariable Integer id, @RequestBody RolePermissionDTO dto) {
        systemManagementService.assignRolePermissions(id, dto);
        return R.ok();
    }

    @PutMapping("/users/{id}/roles")
    public R<Void> assignUserRoles(@PathVariable Integer id, @RequestBody UserRoleDTO dto) {
        systemManagementService.assignUserRoles(id, dto);
        return R.ok();
    }

    @GetMapping("/permissions")
    public R<List<PermissionVO>> permissions(@RequestParam(required = false) String moduleCode) {
        return R.ok(systemManagementService.permissions(moduleCode));
    }

    @PostMapping("/permissions")
    public R<PermissionVO> createPermission(@RequestBody PermissionSaveDTO dto) {
        return R.ok(systemManagementService.savePermission(null, dto));
    }

    @PutMapping("/permissions/{id}")
    public R<PermissionVO> updatePermission(@PathVariable Integer id, @RequestBody PermissionSaveDTO dto) {
        return R.ok(systemManagementService.savePermission(id, dto));
    }

    @DeleteMapping("/permissions/{id}")
    public R<Void> deletePermission(@PathVariable Integer id) {
        systemManagementService.deletePermission(id);
        return R.ok();
    }
}
