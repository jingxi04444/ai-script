package com.aiscript.modules.system.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("sys_prompt_template")
public class SysPromptTemplate extends TenantBaseEntity {
    public Integer providerId;
    public String sceneCode;
    public String templateName;
    public String versionNo;
    public String systemPrompt;
    public String userPrompt;
    public String responseSchema;
    public Integer status;
}
