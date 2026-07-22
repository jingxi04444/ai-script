package com.aiscript.modules.system.vo;

import lombok.Data;

@Data
public class ProviderConfigVO {
    private String id;
    private String providerType;
    private String providerName;
    private String platform;
    private String endpointUrl;
    private Integer priority;
    private Integer timeoutMs;
    private Integer retryCount;
    private String configJson;
    private Integer status;
    private Boolean apiKeyConfigured;
}
