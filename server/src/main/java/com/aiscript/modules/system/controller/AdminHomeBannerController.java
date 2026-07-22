package com.aiscript.modules.system.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.system.dto.HomeBannerDTO;
import com.aiscript.modules.system.service.HomeBannerService;
import com.aiscript.modules.system.vo.HomeBannerVO;
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
@RequestMapping("/api/admin/system/home-banners")
public class AdminHomeBannerController {
    private final HomeBannerService homeBannerService;

    public AdminHomeBannerController(HomeBannerService homeBannerService) {
        this.homeBannerService = homeBannerService;
    }

    @GetMapping
    public R<List<HomeBannerVO>> list() { return R.ok(homeBannerService.listAll()); }

    @PostMapping
    public R<HomeBannerVO> create(@RequestBody HomeBannerDTO dto) { return R.ok(homeBannerService.save(null, dto)); }

    @PutMapping("/{id}")
    public R<HomeBannerVO> update(@PathVariable Integer id, @RequestBody HomeBannerDTO dto) { return R.ok(homeBannerService.save(id, dto)); }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) { homeBannerService.delete(id); return R.ok(); }
}
