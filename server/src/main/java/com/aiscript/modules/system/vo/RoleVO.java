package com.aiscript.modules.system.vo;

import java.util.List;

public class RoleVO {
    public String id;
    public String roleName;
    public String roleCode;
    public String description;
    public Integer isSystem;
    public Integer status;
    public List<String> permissionIds;
}
