package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_permission")
public class SysPermission {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public String permissionName;
    public String permissionCode;
    public String moduleCode;
    public String permissionType;
    public String path;
    public Integer parentId;
    public String icon;
    public Integer sortOrder;
    public Integer status;
    public LocalDateTime createTime;
    public LocalDateTime updateTime;
}
