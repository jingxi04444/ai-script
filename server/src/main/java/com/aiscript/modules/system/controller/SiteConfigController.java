package com.aiscript.modules.system.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.system.service.SiteConfigService;
import com.aiscript.modules.system.vo.PublicSiteConfigVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/site-config")
public class SiteConfigController {
    private final SiteConfigService siteConfigService;

    public SiteConfigController(SiteConfigService siteConfigService) {
        this.siteConfigService = siteConfigService;
    }

    @GetMapping
    public R<PublicSiteConfigVO> getConfig() {
        return R.ok(siteConfigService.getPublicConfig());
    }
}
