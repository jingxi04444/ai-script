package com.aiscript.modules.system.vo;

import java.util.ArrayList;
import java.util.List;

public class ConfigItemVO {
    public String id;
    public String parentId;
    public String nodeType;
    public String groupCode;
    public String configKey;
    public String configName;
    public String configValue;
    public String valueType;
    public String description;
    public Integer sortOrder;
    public Integer status;
    public List<ConfigItemVO> children = new ArrayList<>();
}
