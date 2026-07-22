package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_role_permission")
public class SysRolePermission {
    public Integer roleId;
    public Integer permissionId;
    public LocalDateTime createTime;
}
