package com.aiscript.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "sms")
public class SmsProperties {
    private boolean enabled = false;
    private String provider = "aliyun";
    private String endpoint = "dypnsapi.aliyuncs.com";
    private String accessKeyId;
    private String accessKeySecret;
    private String signName;
    private String templateCode;
    private String regionId = "ap-southeast-1";
    private long codeTtlSeconds = 300;
}
