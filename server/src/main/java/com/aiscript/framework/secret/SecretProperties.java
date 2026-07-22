package com.aiscript.framework.secret;

import lombok.Data;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.secret")
@Data
public class SecretProperties {
    private String cipherKey;
}
