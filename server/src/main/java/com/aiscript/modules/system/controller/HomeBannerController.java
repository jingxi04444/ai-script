package com.aiscript.modules.system.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.system.service.HomeBannerService;
import com.aiscript.modules.system.vo.HomeBannerVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home-banners")
public class HomeBannerController {
    private final HomeBannerService homeBannerService;

    public HomeBannerController(HomeBannerService homeBannerService) {
        this.homeBannerService = homeBannerService;
    }

    @GetMapping
    public R<List<HomeBannerVO>> listEnabled() {
        return R.ok(homeBannerService.listEnabled());
    }
}
