package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_script_format_config")
public class SysScriptFormatConfig {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public String name;
    public String code;
    public String formatRequirement;
    public Integer sortOrder;
    public Integer status;
    public LocalDateTime createTime;
    public LocalDateTime updateTime;
    @TableLogic
    public Integer deleted;
}
