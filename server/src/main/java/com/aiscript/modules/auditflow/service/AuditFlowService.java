package com.aiscript.modules.auditflow.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.auditflow.dto.AuditHandleDTO;
import com.aiscript.modules.auditflow.dto.AuditSubmitDTO;
import com.aiscript.modules.auditflow.vo.AuditTaskVO;

public interface AuditFlowService {
    AuditTaskVO submit(AuditSubmitDTO dto);

    AuditTaskVO approve(Integer taskId, AuditHandleDTO dto);

    AuditTaskVO reject(Integer taskId, AuditHandleDTO dto);

    PageResult<AuditTaskVO> page(PageQuery query, String status);
}
