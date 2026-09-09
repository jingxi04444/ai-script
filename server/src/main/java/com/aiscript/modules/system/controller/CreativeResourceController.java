package com.aiscript.modules.system.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.system.dto.CreativeResourceQueryDTO;
import com.aiscript.modules.system.service.CreativeResourceService;
import com.aiscript.modules.system.vo.CreativeResourceVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/creative-resources")
public class CreativeResourceController {
    private final CreativeResourceService service;
    public CreativeResourceController(CreativeResourceService service) { this.service = service; }
    @GetMapping
    public R<PageResult<CreativeResourceVO>> list(@Valid CreativeResourceQueryDTO query) { return R.ok(service.publishedPage(query)); }
    @GetMapping("/{id}")
    public R<CreativeResourceVO> detail(@PathVariable Long id) { return R.ok(service.publishedDetail(id)); }
}
