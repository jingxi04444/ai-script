package com.aiscript.modules.auditflow.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.auditflow.dto.AuditHandleDTO;
import com.aiscript.modules.auditflow.dto.AuditSubmitDTO;
import com.aiscript.modules.auditflow.service.AuditFlowService;
import com.aiscript.modules.auditflow.vo.AuditTaskVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuditFlowController {
    private final AuditFlowService auditFlowService;

    public AuditFlowController(AuditFlowService auditFlowService) {
        this.auditFlowService = auditFlowService;
    }

    @PostMapping("/audit/tasks")
    public R<AuditTaskVO> submit(@RequestBody AuditSubmitDTO dto) {
        return R.ok(auditFlowService.submit(dto));
    }

    @GetMapping("/admin/audit/tasks")
    public R<PageResult<AuditTaskVO>> page(PageQuery query, @RequestParam(required = false) String status) {
        return R.ok(auditFlowService.page(query, status));
    }

    @PostMapping("/admin/audit/tasks/{id}/approve")
    public R<AuditTaskVO> approve(@PathVariable Integer id, @RequestBody(required = false) AuditHandleDTO dto) {
        return R.ok(auditFlowService.approve(id, dto));
    }

    @PostMapping("/admin/audit/tasks/{id}/reject")
    public R<AuditTaskVO> reject(@PathVariable Integer id, @RequestBody(required = false) AuditHandleDTO dto) {
        return R.ok(auditFlowService.reject(id, dto));
    }
}
