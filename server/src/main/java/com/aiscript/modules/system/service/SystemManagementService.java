package com.aiscript.modules.system.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.system.dto.ImportTemplateSaveDTO;
import com.aiscript.modules.system.dto.PermissionSaveDTO;
import com.aiscript.modules.system.dto.PromptTemplateSaveDTO;
import com.aiscript.modules.system.dto.RolePermissionDTO;
import com.aiscript.modules.system.dto.RoleSaveDTO;
import com.aiscript.modules.system.dto.ScriptFormatSaveDTO;
import com.aiscript.modules.system.dto.UserRoleDTO;
import com.aiscript.modules.system.vo.ImportTemplateVO;
import com.aiscript.modules.system.vo.PermissionVO;
import com.aiscript.modules.system.vo.PromptTemplateVO;
import com.aiscript.modules.system.vo.RoleVO;
import com.aiscript.modules.system.vo.ScriptFormatVO;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface SystemManagementService {
    PageResult<PromptTemplateVO> promptPage(PageQuery query, String sceneCode);

    PromptTemplateVO savePrompt(Integer id, PromptTemplateSaveDTO dto);

    void deletePrompt(Integer id);

    PageResult<ImportTemplateVO> importTemplatePage(PageQuery query, String templateType);

    ImportTemplateVO saveImportTemplate(Integer id, ImportTemplateSaveDTO dto);

    ImportTemplateVO uploadImportTemplateFile(Integer id, MultipartFile file);

    void deleteImportTemplate(Integer id);

    PageResult<ScriptFormatVO> scriptFormatPage(PageQuery query, Integer status);

    List<ScriptFormatVO> enabledScriptFormats();

    ScriptFormatVO saveScriptFormat(Integer id, ScriptFormatSaveDTO dto);

    void deleteScriptFormat(Integer id);

    PageResult<RoleVO> rolePage(PageQuery query);

    RoleVO saveRole(Integer id, RoleSaveDTO dto);

    void deleteRole(Integer id);

    List<PermissionVO> permissions(String moduleCode);

    PermissionVO savePermission(Integer id, PermissionSaveDTO dto);

    void deletePermission(Integer id);

    void assignRolePermissions(Integer roleId, RolePermissionDTO dto);

    void assignUserRoles(Integer userId, UserRoleDTO dto);
}
