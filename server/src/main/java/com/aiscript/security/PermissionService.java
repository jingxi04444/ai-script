package com.aiscript.security;

import com.aiscript.modules.auth.vo.MenuVO;
import com.aiscript.modules.system.entity.SysPermission;
import com.aiscript.modules.system.entity.SysRole;
import com.aiscript.modules.system.entity.SysRolePermission;
import com.aiscript.modules.system.entity.SysUserRole;
import com.aiscript.modules.system.mapper.SysPermissionMapper;
import com.aiscript.modules.system.mapper.SysRoleMapper;
import com.aiscript.modules.system.mapper.SysRolePermissionMapper;
import com.aiscript.modules.system.mapper.SysUserRoleMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;

@Service("permissionService")
public class PermissionService {
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final SysRolePermissionMapper rolePermissionMapper;
    private final SysPermissionMapper permissionMapper;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public PermissionService(
        SysUserRoleMapper userRoleMapper,
        SysRoleMapper roleMapper,
        SysRolePermissionMapper rolePermissionMapper,
        SysPermissionMapper permissionMapper
    ) {
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.rolePermissionMapper = rolePermissionMapper;
        this.permissionMapper = permissionMapper;
    }

    public boolean hasPermission(String permission) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof LoginUser loginUser)) {
            return false;
        }
        return loginUser.getPermissions().contains(permission);
    }

    public Collection<String> loadPermissions(Integer userId, String userType) {
        return loadEnabledPermissions(userId).stream()
            .map(permission -> permission.permissionCode)
            .filter(StringUtils::hasText)
            .collect(java.util.stream.Collectors.toCollection(HashSet::new));
    }

    public List<String> loadRoleCodes(Integer userId) {
        return loadEnabledRoles(userId).stream()
            .map(role -> role.roleCode)
            .filter(StringUtils::hasText)
            .toList();
    }

    public List<MenuVO> loadMenus(Integer userId) {
        List<SysPermission> menuPermissions = loadEnabledPermissions(userId).stream()
            .filter(permission -> "menu".equals(permission.permissionType))
            .sorted(Comparator.comparing(permission -> permission.sortOrder == null ? 0 : permission.sortOrder))
            .toList();
        Map<Integer, MenuVO> menuMap = new LinkedHashMap<>();
        for (SysPermission permission : menuPermissions) {
            MenuVO menu = toMenuVO(permission);
            menuMap.put(permission.id, menu);
        }
        List<MenuVO> roots = new java.util.ArrayList<>();
        for (SysPermission permission : menuPermissions) {
            MenuVO menu = menuMap.get(permission.id);
            if (permission.parentId != null && menuMap.containsKey(permission.parentId)) {
                menuMap.get(permission.parentId).getChildren().add(menu);
            } else {
                roots.add(menu);
            }
        }
        return roots;
    }

    private List<SysPermission> loadEnabledPermissions(Integer userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        List<SysRole> roles = loadEnabledRoles(userId);
        if (roles.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> enabledRoleIds = roles.stream().map(role -> role.id).toList();
        List<SysRolePermission> relations = rolePermissionMapper.selectList(new QueryWrapper<SysRolePermission>().in("role_id", enabledRoleIds));
        if (relations.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> permissionIds = relations.stream().map(relation -> relation.permissionId).distinct().toList();
        return permissionMapper.selectList(new QueryWrapper<SysPermission>().in("id", permissionIds).eq("status", 1));
    }

    private List<SysRole> loadEnabledRoles(Integer userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        List<SysUserRole> userRoles = userRoleMapper.selectList(new QueryWrapper<SysUserRole>().eq("user_id", userId));
        if (userRoles.isEmpty()) {
            return Collections.emptyList();
        }
        List<Integer> roleIds = userRoles.stream().map(relation -> relation.roleId).distinct().toList();
        return roleMapper.selectList(new QueryWrapper<SysRole>().in("id", roleIds).eq("status", 1));
    }

    private MenuVO toMenuVO(SysPermission permission) {
        MenuVO menu = new MenuVO();
        menu.setId(String.valueOf(permission.id));
        menu.setParentId(permission.parentId == null ? null : String.valueOf(permission.parentId));
        menu.setName(permission.permissionName);
        menu.setCode(permission.permissionCode);
        menu.setModuleCode(permission.moduleCode);
        menu.setType(permission.permissionType);
        menu.setPath(permission.path);
        menu.setIcon(permission.icon);
        menu.setSortOrder(permission.sortOrder);
        return menu;
    }

    public Set<String> requiredApiPermissions(String requestPath) {
        if (!StringUtils.hasText(requestPath)) {
            return Collections.emptySet();
        }
        List<SysPermission> apiPermissions = permissionMapper.selectList(new QueryWrapper<SysPermission>()
            .eq("permission_type", "api")
            .eq("status", 1)
            .isNotNull("path"));
        return apiPermissions.stream()
            .filter(permission -> StringUtils.hasText(permission.path))
            .filter(permission -> pathMatcher.match(permission.path, requestPath))
            .map(permission -> permission.permissionCode)
            .filter(StringUtils::hasText)
            .collect(java.util.stream.Collectors.toSet());
    }
}
