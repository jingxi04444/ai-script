package com.aiscript.modules.system.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.system.dto.ProviderConfigSaveDTO;
import com.aiscript.modules.system.service.ProviderConfigService;
import com.aiscript.modules.system.vo.ProviderConfigVO;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/providers")
public class AdminProviderConfigController {
    private final ProviderConfigService providerConfigService;

    public AdminProviderConfigController(ProviderConfigService providerConfigService) {
        this.providerConfigService = providerConfigService;
    }

    @GetMapping
    public R<PageResult<ProviderConfigVO>> page(PageQuery query, @RequestParam(required = false) String providerType) {
        return R.ok(providerConfigService.page(query, providerType));
    }

    @PostMapping
    public R<ProviderConfigVO> create(@RequestBody ProviderConfigSaveDTO dto) {
        return R.ok(providerConfigService.save(null, dto));
    }

    @PutMapping("/{id}")
    public R<ProviderConfigVO> update(@PathVariable Integer id, @RequestBody ProviderConfigSaveDTO dto) {
        return R.ok(providerConfigService.save(id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        providerConfigService.delete(id);
        return R.ok();
    }
}
