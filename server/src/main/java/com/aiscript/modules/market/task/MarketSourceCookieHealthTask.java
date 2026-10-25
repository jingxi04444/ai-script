package com.aiscript.modules.market.task;

import com.aiscript.modules.market.service.MarketSourceCookieHealthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MarketSourceCookieHealthTask {
    private final MarketSourceCookieHealthService healthService;

    public MarketSourceCookieHealthTask(MarketSourceCookieHealthService healthService) {
        this.healthService = healthService;
    }

    @Scheduled(cron = "${aiscript.market.cookie-check-cron:0 10 */6 * * ?}")
    public void checkEnabledSources() {
        try {
            healthService.validateAllEnabled();
        } catch (RuntimeException exception) {
            log.warn("Market source cookie health check stopped: {}", exception.getMessage());
        }
    }
}
