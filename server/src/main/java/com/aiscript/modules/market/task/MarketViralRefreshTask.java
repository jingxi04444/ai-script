package com.aiscript.modules.market.task;

import com.aiscript.modules.market.service.MarketViralService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class MarketViralRefreshTask {
    private final MarketViralService marketViralService;

    public MarketViralRefreshTask(MarketViralService marketViralService) {
        this.marketViralService = marketViralService;
    }

    @Async("aiTaskExecutor")
    public void run(Integer taskId) {
        marketViralService.executeRefreshTask(taskId);
    }
}
