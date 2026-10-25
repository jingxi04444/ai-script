package com.aiscript.modules.market.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MarketSourceConfigVO {
    private String id;
    private String platform;
    private String platformName;
    private Boolean cookieConfigured;
    private Boolean alertPhoneConfigured;
    private String maskedAlertPhone;
    private Boolean enabled;
    private Boolean alertEnabled;
    private String cookieStatus;
    private Integer consecutiveFailures;
    private String lastErrorMessage;
    private LocalDateTime lastCheckedAt;
    private LocalDateTime lastValidAt;
    private LocalDateTime lastAlertAt;
}
