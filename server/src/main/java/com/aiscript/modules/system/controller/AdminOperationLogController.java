package com.aiscript.modules.system.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.audit.OperationLogService;
import com.aiscript.framework.audit.OperationLogVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/operation-logs")
public class AdminOperationLogController {
    private final OperationLogService operationLogService;

    public AdminOperationLogController(OperationLogService operationLogService) {
        this.operationLogService = operationLogService;
    }

    @GetMapping
    public R<PageResult<OperationLogVO>> page(
        PageQuery query,
        @RequestParam(required = false) String moduleCode,
        @RequestParam(required = false) String resultStatus
    ) {
        return R.ok(operationLogService.page(query, moduleCode, resultStatus));
    }
}
