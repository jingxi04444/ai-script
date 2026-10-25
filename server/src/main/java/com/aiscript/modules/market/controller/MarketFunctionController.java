package com.aiscript.modules.market.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.market.service.MarketFunctionService;
import com.aiscript.modules.market.vo.MarketFunctionVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/market/functions")
public class MarketFunctionController {
    private final MarketFunctionService service;

    public MarketFunctionController(MarketFunctionService service) {
        this.service = service;
    }

    @GetMapping
    public R<List<MarketFunctionVO>> list() {
        return R.ok(service.listPublished());
    }
}
