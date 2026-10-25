package com.aiscript.modules.market.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.market.dto.MarketFunctionSaveDTO;
import com.aiscript.modules.market.service.MarketFunctionService;
import com.aiscript.modules.market.vo.MarketFunctionVO;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/market-functions")
public class AdminMarketFunctionController {
    private final MarketFunctionService service;

    public AdminMarketFunctionController(MarketFunctionService service) {
        this.service = service;
    }

    @GetMapping
    public R<List<MarketFunctionVO>> list() {
        return R.ok(service.listAdmin());
    }

    @PostMapping
    public R<MarketFunctionVO> create(@RequestBody MarketFunctionSaveDTO dto) {
        return R.ok(service.save(null, dto));
    }

    @PutMapping("/{id}")
    public R<MarketFunctionVO> update(
        @PathVariable Long id,
        @RequestBody MarketFunctionSaveDTO dto
    ) {
        return R.ok(service.save(id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return R.ok();
    }
}
