package com.aiscript.modules.market.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.market.dto.MarketViralQueryDTO;
import com.aiscript.modules.market.dto.MarketViralRefreshDTO;
import com.aiscript.modules.market.service.MarketViralFavoriteService;
import com.aiscript.modules.market.service.MarketViralService;
import com.aiscript.modules.market.vo.MarketViralRefreshVO;
import com.aiscript.modules.market.vo.MarketViralVideoVO;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/market/viral-videos")
public class MarketViralController {
    private final MarketViralService marketViralService;
    private final MarketViralFavoriteService favoriteService;

    public MarketViralController(
        MarketViralService marketViralService,
        MarketViralFavoriteService favoriteService
    ) {
        this.marketViralService = marketViralService;
        this.favoriteService = favoriteService;
    }

    @GetMapping
    public R<PageResult<MarketViralVideoVO>> page(@Valid MarketViralQueryDTO query) {
        return R.ok(marketViralService.page(query));
    }

    @PostMapping("/refresh")
    public R<MarketViralRefreshVO> refresh(@Valid @RequestBody MarketViralRefreshDTO dto) {
        return R.ok(marketViralService.createRefreshTask(dto));
    }

    @PostMapping("/{id}/favorite")
    public R<Map<String, Boolean>> toggleFavorite(@PathVariable Long id) {
        return R.ok(Map.of("favorited", favoriteService.toggle(id)));
    }
}
