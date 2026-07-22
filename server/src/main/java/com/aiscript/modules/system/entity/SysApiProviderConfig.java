package com.aiscript.modules.system.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("sys_api_provider_config")
@Data
@EqualsAndHashCode(callSuper = true)
public class SysApiProviderConfig extends TenantBaseEntity {
    private String providerType;
    private String providerName;
    private String platform;
    private String endpointUrl;
    private String apiKeyEncrypted;
    private Integer priority;
    private Integer rateLimitPerMinute;
    private Integer timeoutMs;
    private Integer retryCount;
    private String configJson;
    private Integer status;
}
