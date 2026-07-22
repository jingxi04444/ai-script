package com.aiscript.modules.system.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.system.dto.ImportTemplateSaveDTO;
import com.aiscript.modules.system.dto.PermissionSaveDTO;
import com.aiscript.modules.system.dto.PromptTemplateSaveDTO;
import com.aiscript.modules.system.dto.RolePermissionDTO;
import com.aiscript.modules.system.dto.RoleSaveDTO;
import com.aiscript.modules.system.dto.ScriptFormatSaveDTO;
import com.aiscript.modules.system.dto.UserRoleDTO;
import com.aiscript.modules.system.entity.SysImportTemplateConfig;
import com.aiscript.modules.system.entity.SysPermission;
import com.aiscript.modules.system.entity.SysPromptTemplate;
import com.aiscript.modules.system.entity.SysRole;
import com.aiscript.modules.system.entity.SysRolePermission;
import com.aiscript.modules.system.entity.SysScriptFormatConfig;
import com.aiscript.modules.system.entity.SysUserRole;
import com.aiscript.modules.system.mapper.SysImportTemplateConfigMapper;
import com.aiscript.modules.system.mapper.SysPermissionMapper;
import com.aiscript.modules.system.mapper.SysPromptTemplateMapper;
import com.aiscript.modules.system.mapper.SysRoleMapper;
import com.aiscript.modules.system.mapper.SysRolePermissionMapper;
import com.aiscript.modules.system.mapper.SysScriptFormatConfigMapper;
import com.aiscript.modules.system.mapper.SysUserRoleMapper;
import com.aiscript.modules.system.service.SystemManagementService;
import com.aiscript.modules.system.vo.ImportTemplateVO;
import com.aiscript.modules.system.vo.PermissionVO;
import com.aiscript.modules.system.vo.PromptTemplateVO;
import com.aiscript.modules.system.vo.RoleVO;
import com.aiscript.modules.system.vo.ScriptFormatVO;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SystemManagementServiceImpl implements SystemManagementService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final SysPromptTemplateMapper promptTemplateMapper;
    private final SysImportTemplateConfigMapper importTemplateMapper;
    private final SysScriptFormatConfigMapper scriptFormatMapper;
    private final SysRoleMapper roleMapper;
    private final SysPermissionMapper permissionMapper;
    private final SysRolePermissionMapper rolePermissionMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final StorageClient storageClient;

    public SystemManagementServiceImpl(
        SysPromptTemplateMapper promptTemplateMapper,
        SysImportTemplateConfigMapper importTemplateMapper,
        SysScriptFormatConfigMapper scriptFormatMapper,
        SysRoleMapper roleMapper,
        SysPermissionMapper permissionMapper,
        SysRolePermissionMapper rolePermissionMapper,
        SysUserRoleMapper userRoleMapper,
        StorageClient storageClient
    ) {
        this.promptTemplateMapper = promptTemplateMapper;
        this.importTemplateMapper = importTemplateMapper;
        this.scriptFormatMapper = scriptFormatMapper;
        this.roleMapper = roleMapper;
        this.permissionMapper = permissionMapper;
        this.rolePermissionMapper = rolePermissionMapper;
        this.userRoleMapper = userRoleMapper;
        this.storageClient = storageClient;
    }

    @Override
    public PageResult<PromptTemplateVO> promptPage(PageQuery query, String sceneCode) {
        QueryWrapper<SysPromptTemplate> wrapper = new QueryWrapper<>();
        wrapper.eq(StringUtils.hasText(sceneCode), "scene_code", sceneCode)
            .like(StringUtils.hasText(query.getKeyword()), "template_name", query.getKeyword())
            .orderByDesc("create_time");
        IPage<SysPromptTemplate> page = promptTemplateMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toPromptVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptTemplateVO savePrompt(Integer id, PromptTemplateSaveDTO dto) {
        SysPromptTemplate entity = id == null ? new SysPromptTemplate() : promptTemplateMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("Prompt模板不存在");
        }
        if (id == null) {
            entity.setTenantId(currentTenantId());
        }
        entity.providerId = StringUtils.hasText(dto.providerId) ? Integer.valueOf(dto.providerId) : null;
        entity.sceneCode = dto.sceneCode;
        entity.templateName = dto.templateName;
        entity.versionNo = StringUtils.hasText(dto.versionNo) ? dto.versionNo : "v1";
        entity.systemPrompt = dto.systemPrompt;
        entity.userPrompt = dto.userPrompt;
        entity.responseSchema = dto.responseSchema;
        entity.status = dto.status == null ? 1 : dto.status;
        if (id == null) {
            promptTemplateMapper.insert(entity);
        } else {
            promptTemplateMapper.updateById(entity);
        }
        return toPromptVO(entity);
    }

    @Override
    public void deletePrompt(Integer id) {
        promptTemplateMapper.deleteById(id);
    }

    @Override
    public PageResult<ImportTemplateVO> importTemplatePage(PageQuery query, String templateType) {
        QueryWrapper<SysImportTemplateConfig> wrapper = new QueryWrapper<>();
        wrapper.eq(StringUtils.hasText(templateType), "template_type", templateType)
            .like(StringUtils.hasText(query.getKeyword()), "template_name", query.getKeyword())
            .orderByDesc("create_time");
        IPage<SysImportTemplateConfig> page = importTemplateMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toImportVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImportTemplateVO saveImportTemplate(Integer id, ImportTemplateSaveDTO dto) {
        SysImportTemplateConfig entity = id == null ? new SysImportTemplateConfig() : importTemplateMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("导入模板不存在");
        }
        entity.templateType = dto.templateType;
        entity.templateName = dto.templateName;
        entity.downloadFileName = dto.downloadFileName;
        if (StringUtils.hasText(dto.templateFileKey)) {
            entity.templateFileKey = dto.templateFileKey;
            entity.templateFileUrl = storageClient.presignedUrl(dto.templateFileKey);
        } else if (StringUtils.hasText(dto.templateFileUrl)) {
            entity.templateFileUrl = dto.templateFileUrl;
        }
        entity.columnsJson = dto.columnsJson;
        entity.sampleRowsJson = dto.sampleRowsJson;
        entity.description = dto.description;
        entity.status = dto.status == null ? 1 : dto.status;
        if (id == null) {
            importTemplateMapper.insert(entity);
        } else {
            importTemplateMapper.updateById(entity);
        }
        return toImportVO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImportTemplateVO uploadImportTemplateFile(Integer id, MultipartFile file) {
        SysImportTemplateConfig entity = importTemplateMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("导入模板不存在");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择要上传的模板文件");
        }
        String originalFilename = file.getOriginalFilename();
        String suffix = "";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String objectKey = "import-templates/" + entity.templateType + "/" + LocalDate.now() + "/"
            + UUID.randomUUID().toString().replace("-", "") + suffix;
        try {
            objectKey = storageClient.putObject(objectKey, file.getInputStream(), file.getSize(), file.getContentType());
        } catch (IOException ex) {
            throw new BusinessException("模板文件读取失败：" + ex.getMessage());
        }
        entity.templateFileKey = objectKey;
        entity.templateFileUrl = storageClient.presignedUrl(objectKey);
        if (StringUtils.hasText(originalFilename)) {
            entity.downloadFileName = originalFilename;
        }
        importTemplateMapper.updateById(entity);
        return toImportVO(entity);
    }

    @Override
    public void deleteImportTemplate(Integer id) {
        importTemplateMapper.deleteById(id);
    }

    @Override
    public PageResult<ScriptFormatVO> scriptFormatPage(PageQuery query, Integer status) {
        QueryWrapper<SysScriptFormatConfig> wrapper = new QueryWrapper<>();
        wrapper.eq(status != null, "status", status)
            .and(StringUtils.hasText(query.getKeyword()), w -> w.like("name", query.getKeyword()).or().like("code", query.getKeyword()))
            .orderByAsc("sort_order").orderByDesc("create_time");
        IPage<SysScriptFormatConfig> page = scriptFormatMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toScriptFormatVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public List<ScriptFormatVO> enabledScriptFormats() {
        QueryWrapper<SysScriptFormatConfig> wrapper = new QueryWrapper<>();
        wrapper.eq("status", 1).orderByAsc("sort_order").orderByAsc("id");
        return scriptFormatMapper.selectList(wrapper).stream().map(this::toScriptFormatVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptFormatVO saveScriptFormat(Integer id, ScriptFormatSaveDTO dto) {
        SysScriptFormatConfig entity = id == null ? new SysScriptFormatConfig() : scriptFormatMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("脚本格式不存在");
        }
        entity.name = dto.name;
        entity.code = dto.code;
        entity.formatRequirement = dto.formatRequirement;
        entity.sortOrder = dto.sortOrder == null ? 0 : dto.sortOrder;
        entity.status = dto.status == null ? 1 : dto.status;
        if (id == null) {
            scriptFormatMapper.insert(entity);
        } else {
            scriptFormatMapper.updateById(entity);
        }
        return toScriptFormatVO(entity);
    }

    @Override
    public void deleteScriptFormat(Integer id) {
        scriptFormatMapper.deleteById(id);
    }

    @Override
    public PageResult<RoleVO> rolePage(PageQuery query) {
        QueryWrapper<SysRole> wrapper = new QueryWrapper<>();
        wrapper.like(StringUtils.hasText(query.getKeyword()), "role_name", query.getKeyword()).orderByDesc("create_time");
        IPage<SysRole> page = roleMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toRoleVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RoleVO saveRole(Integer id, RoleSaveDTO dto) {
        SysRole entity = id == null ? new SysRole() : roleMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("角色不存在");
        }
        if (id == null) {
            entity.tenantId = currentTenantId();
            entity.isSystem = 0;
        }
        entity.roleName = dto.roleName;
        entity.roleCode = dto.roleCode;
        entity.description = dto.description;
        entity.status = dto.status == null ? 1 : dto.status;
        if (id == null) {
            roleMapper.insert(entity);
        } else {
            roleMapper.updateById(entity);
        }
        return toRoleVO(entity);
    }

    @Override
    public void deleteRole(Integer id) {
        roleMapper.deleteById(id);
    }

    @Override
    public List<PermissionVO> permissions(String moduleCode) {
        QueryWrapper<SysPermission> wrapper = new QueryWrapper<>();
        wrapper.eq(StringUtils.hasText(moduleCode), "module_code", moduleCode).orderByAsc("sort_order").orderByAsc("id");
        return permissionMapper.selectList(wrapper).stream().map(this::toPermissionVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PermissionVO savePermission(Integer id, PermissionSaveDTO dto) {
        SysPermission entity = id == null ? new SysPermission() : permissionMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("权限不存在");
        }
        entity.permissionName = dto.permissionName;
        entity.permissionCode = dto.permissionCode;
        entity.moduleCode = dto.moduleCode;
        entity.permissionType = StringUtils.hasText(dto.permissionType) ? dto.permissionType : "button";
        entity.path = dto.path;
        entity.parentId = StringUtils.hasText(dto.parentId) ? Integer.valueOf(dto.parentId) : null;
        entity.icon = dto.icon;
        entity.sortOrder = dto.sortOrder == null ? 0 : dto.sortOrder;
        entity.status = dto.status == null ? 1 : dto.status;
        if (id == null) {
            permissionMapper.insert(entity);
        } else {
            permissionMapper.updateById(entity);
        }
        return toPermissionVO(entity);
    }

    @Override
    public void deletePermission(Integer id) {
        permissionMapper.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignRolePermissions(Integer roleId, RolePermissionDTO dto) {
        rolePermissionMapper.delete(new QueryWrapper<SysRolePermission>().eq("role_id", roleId));
        for (String permissionId : dto.permissionIds == null ? Collections.<String>emptyList() : dto.permissionIds) {
            SysRolePermission relation = new SysRolePermission();
            relation.roleId = roleId;
            relation.permissionId = Integer.valueOf(permissionId);
            rolePermissionMapper.insert(relation);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignUserRoles(Integer userId, UserRoleDTO dto) {
        userRoleMapper.delete(new QueryWrapper<SysUserRole>().eq("user_id", userId));
        for (String roleId : dto.roleIds == null ? Collections.<String>emptyList() : dto.roleIds) {
            SysUserRole relation = new SysUserRole();
            relation.userId = userId;
            relation.roleId = Integer.valueOf(roleId);
            userRoleMapper.insert(relation);
        }
    }

    private PromptTemplateVO toPromptVO(SysPromptTemplate entity) {
        PromptTemplateVO vo = new PromptTemplateVO();
        vo.id = String.valueOf(entity.getId());
        vo.providerId = entity.providerId == null ? null : String.valueOf(entity.providerId);
        vo.sceneCode = entity.sceneCode;
        vo.templateName = entity.templateName;
        vo.versionNo = entity.versionNo;
        vo.systemPrompt = entity.systemPrompt;
        vo.userPrompt = entity.userPrompt;
        vo.responseSchema = entity.responseSchema;
        vo.status = entity.status;
        return vo;
    }

    private ImportTemplateVO toImportVO(SysImportTemplateConfig entity) {
        ImportTemplateVO vo = new ImportTemplateVO();
        vo.id = String.valueOf(entity.id);
        vo.templateType = entity.templateType;
        vo.templateName = entity.templateName;
        vo.downloadFileName = entity.downloadFileName;
        vo.templateFileKey = entity.templateFileKey;
        vo.templateFileUrl = StringUtils.hasText(entity.templateFileKey) ? storageClient.presignedUrl(entity.templateFileKey) : entity.templateFileUrl;
        vo.columnsJson = entity.columnsJson;
        vo.sampleRowsJson = entity.sampleRowsJson;
        vo.description = entity.description;
        vo.status = entity.status;
        return vo;
    }

    private RoleVO toRoleVO(SysRole entity) {
        RoleVO vo = new RoleVO();
        vo.id = String.valueOf(entity.id);
        vo.roleName = entity.roleName;
        vo.roleCode = entity.roleCode;
        vo.description = entity.description;
        vo.isSystem = entity.isSystem;
        vo.status = entity.status;
        vo.permissionIds = rolePermissionMapper.selectList(new QueryWrapper<SysRolePermission>().eq("role_id", entity.id))
            .stream()
            .map(relation -> String.valueOf(relation.permissionId))
            .toList();
        return vo;
    }

    private ScriptFormatVO toScriptFormatVO(SysScriptFormatConfig entity) {
        ScriptFormatVO vo = new ScriptFormatVO();
        vo.id = String.valueOf(entity.id);
        vo.name = entity.name;
        vo.code = entity.code;
        vo.formatRequirement = entity.formatRequirement;
        vo.sortOrder = entity.sortOrder;
        vo.status = entity.status;
        return vo;
    }

    private PermissionVO toPermissionVO(SysPermission entity) {
        PermissionVO vo = new PermissionVO();
        vo.id = String.valueOf(entity.id);
        vo.permissionName = entity.permissionName;
        vo.permissionCode = entity.permissionCode;
        vo.moduleCode = entity.moduleCode;
        vo.permissionType = entity.permissionType;
        vo.path = entity.path;
        vo.parentId = entity.parentId == null ? null : String.valueOf(entity.parentId);
        vo.icon = entity.icon;
        vo.sortOrder = entity.sortOrder;
        vo.status = entity.status;
        return vo;
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }
}
