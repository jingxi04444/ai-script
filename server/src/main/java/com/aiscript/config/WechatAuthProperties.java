package com.aiscript.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.auth.wechat")
public class WechatAuthProperties {
    private boolean enabled = false;
    private String appId;
    private String appSecret;
    private String callbackUrl;
}
