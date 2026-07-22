package com.aiscript.modules.system.dto;

import lombok.Data;

@Data
public class ProviderConfigSaveDTO {
    private String providerType;
    private String providerName;
    private String platform;
    private String endpointUrl;
    private String apiKey;
    private Integer priority;
    private Integer timeoutMs;
    private Integer retryCount;
    private String configJson;
    private Integer status;
}
