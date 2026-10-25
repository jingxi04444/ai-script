package com.aiscript.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "aiscript.market.viral-search")
public class MarketViralProperties {
    private boolean enabled = true;
    private String skillUrl = "http://127.0.0.1:8091/api/internal/skills/market-category-viral-search/execute";
    private String skillToken;
    private int timeoutSeconds = 600;
    private int freshnessDays = 7;
}
