package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_user_role")
public class SysUserRole {
    public Integer userId;
    public Integer roleId;
    public LocalDateTime createTime;
}
