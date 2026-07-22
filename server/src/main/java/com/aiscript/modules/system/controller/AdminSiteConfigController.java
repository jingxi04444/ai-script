package com.aiscript.modules.system.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.system.dto.SiteConfigSaveDTO;
import com.aiscript.modules.system.service.SiteConfigService;
import com.aiscript.modules.system.vo.SiteConfigVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system/site-config")
public class AdminSiteConfigController {
    private final SiteConfigService siteConfigService;

    public AdminSiteConfigController(SiteConfigService siteConfigService) {
        this.siteConfigService = siteConfigService;
    }

    @GetMapping
    public R<SiteConfigVO> getConfig() {
        return R.ok(siteConfigService.getConfig());
    }

    @PutMapping
    public R<SiteConfigVO> save(@RequestBody SiteConfigSaveDTO dto) {
        return R.ok(siteConfigService.save(dto));
    }
}
