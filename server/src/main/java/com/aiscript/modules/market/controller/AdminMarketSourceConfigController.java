package com.aiscript.modules.market.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.market.dto.MarketSourceConfigSaveDTO;
import com.aiscript.modules.market.service.MarketSourceConfigService;
import com.aiscript.modules.market.service.MarketSourceCookieHealthService;
import com.aiscript.modules.market.vo.MarketSourceConfigVO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/market-sources")
public class AdminMarketSourceConfigController {
    private final MarketSourceConfigService configService;
    private final MarketSourceCookieHealthService healthService;

    public AdminMarketSourceConfigController(
        MarketSourceConfigService configService,
        MarketSourceCookieHealthService healthService
    ) {
        this.configService = configService;
        this.healthService = healthService;
    }

    @GetMapping
    public R<List<MarketSourceConfigVO>> list() {
        return R.ok(configService.listCurrentTenant());
    }

    @PutMapping("/{platform}")
    public R<MarketSourceConfigVO> save(
        @PathVariable String platform,
        @Valid @RequestBody MarketSourceConfigSaveDTO dto
    ) {
        return R.ok(configService.save(platform, dto));
    }

    @PostMapping("/{platform}/validate")
    public R<MarketSourceConfigVO> validate(@PathVariable String platform) {
        healthService.validateCurrentTenant(platform);
        return R.ok(configService.listCurrentTenant().stream()
            .filter(item -> platform.equalsIgnoreCase(item.getPlatform()))
            .findFirst()
            .orElseThrow());
    }
}
