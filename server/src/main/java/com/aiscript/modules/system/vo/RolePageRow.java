package com.aiscript.modules.system.vo;

import lombok.Data;

@Data
public class RolePageRow {
    private Integer id;
    private String roleName;
    private String roleCode;
    private String description;
    private Integer isSystem;
    private Integer status;
    private String permissionIds;
}
