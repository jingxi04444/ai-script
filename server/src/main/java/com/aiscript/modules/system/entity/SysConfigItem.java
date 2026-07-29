package com.aiscript.modules.system.entity;

import com.aiscript.common.model.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("sys_config_item")
@Data
@EqualsAndHashCode(callSuper = true)
public class SysConfigItem extends BaseEntity {
    private Integer parentId;
    private String nodeType;
    private String groupCode;
    private String configKey;
    private String configName;
    private String configValue;
    private String valueType;
    private String description;
    private Integer sortOrder;
    private Integer status;
}
