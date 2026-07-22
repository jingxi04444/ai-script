package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_role")
public class SysRole {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public Integer tenantId;
    public String roleName;
    public String roleCode;
    public String description;
    public Integer isSystem;
    public Integer status;
    public LocalDateTime createTime;
    public LocalDateTime updateTime;
    @TableLogic
    public Integer deleted;
}
