package com.aiscript.framework.storage;

import lombok.Data;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.storage")
@Data
public class StorageProperties {
    private String provider = "minio";
    private String endpoint;
    private String bucket;
    private String accessKey;
    private String secretKey;
    private String region;
    private String publicBaseUrl;
    private String localPath = "/opt/ai-script/uploads";
}
