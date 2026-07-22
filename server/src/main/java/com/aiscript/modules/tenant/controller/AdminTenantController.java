package com.aiscript.modules.tenant.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.tenant.dto.TenantSaveDTO;
import com.aiscript.modules.tenant.service.TenantService;
import com.aiscript.modules.tenant.vo.TenantVO;
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
@RequestMapping("/api/admin/tenants")
public class AdminTenantController {
    private final TenantService tenantService;

    public AdminTenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping
    public R<PageResult<TenantVO>> page(PageQuery query, @RequestParam(required = false) Integer status) {
        return R.ok(tenantService.page(query, status));
    }

    @GetMapping("/{id}")
    public R<TenantVO> getById(@PathVariable Integer id) {
        return R.ok(tenantService.getById(id));
    }

    @PostMapping
    public R<TenantVO> create(@RequestBody TenantSaveDTO dto) {
        return R.ok(tenantService.save(null, dto));
    }

    @PutMapping("/{id}")
    public R<TenantVO> update(@PathVariable Integer id, @RequestBody TenantSaveDTO dto) {
        return R.ok(tenantService.save(id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        tenantService.delete(id);
        return R.ok();
    }
}
