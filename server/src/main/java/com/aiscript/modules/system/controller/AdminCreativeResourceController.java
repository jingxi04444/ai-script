package com.aiscript.modules.system.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.system.dto.CreativeResourceQueryDTO;
import com.aiscript.modules.system.dto.CreativeResourceSaveDTO;
import com.aiscript.modules.system.service.CreativeResourceService;
import com.aiscript.modules.system.vo.CreativeResourceVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/creative-resources")
public class AdminCreativeResourceController {
    private final CreativeResourceService service;
    public AdminCreativeResourceController(CreativeResourceService service) { this.service = service; }
    @GetMapping
    public R<PageResult<CreativeResourceVO>> list(@Valid CreativeResourceQueryDTO query) { return R.ok(service.adminPage(query)); }
    @PostMapping
    public R<CreativeResourceVO> create(@RequestBody CreativeResourceSaveDTO dto) { return R.ok(service.save(null, dto)); }
    @PutMapping("/{id}")
    public R<CreativeResourceVO> update(@PathVariable Long id, @RequestBody CreativeResourceSaveDTO dto) { return R.ok(service.save(id, dto)); }
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) { service.delete(id); return R.ok(); }
}
