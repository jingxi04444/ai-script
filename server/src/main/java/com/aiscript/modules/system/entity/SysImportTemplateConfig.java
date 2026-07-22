package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_import_template_config")
public class SysImportTemplateConfig {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public String templateType;
    public String templateName;
    public String downloadFileName;
    public String templateFileKey;
    public String templateFileUrl;
    public String columnsJson;
    public String sampleRowsJson;
    public String description;
    public Integer status;
    public LocalDateTime createTime;
    public LocalDateTime updateTime;
    @TableLogic
    public Integer deleted;
}
