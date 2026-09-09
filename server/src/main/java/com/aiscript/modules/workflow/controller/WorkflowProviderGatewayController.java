package com.aiscript.modules.workflow.controller;

import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.workflow.dto.WorkflowProviderExecuteDTO;
import com.aiscript.modules.workflow.dto.WorkflowProviderPollDTO;
import com.aiscript.modules.workflow.service.WorkflowProviderGatewayService;
import com.aiscript.modules.workflow.vo.WorkflowProviderExecuteVO;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/workflow/providers")
public class WorkflowProviderGatewayController {
    private final WorkflowProviderGatewayService gatewayService;
    private final String gatewayToken;

    public WorkflowProviderGatewayController(
        WorkflowProviderGatewayService gatewayService,
        @Value("${aiscript.workflow.provider-gateway.token:}") String gatewayToken
    ) {
        this.gatewayService = gatewayService;
        this.gatewayToken = gatewayToken;
    }

    @PostMapping("/execute")
    public R<WorkflowProviderExecuteVO> execute(
        @RequestHeader(value = "X-Workflow-Token", required = false) String token,
        @Valid @RequestBody WorkflowProviderExecuteDTO dto
    ) {
        requireInternalToken(token);
        Integer previousTenantId = TenantContext.getTenantId();
        TenantContext.setTenantId(dto.getTenantId());
        try {
            return R.ok(gatewayService.execute(dto));
        } finally {
            if (previousTenantId == null) TenantContext.clear();
            else TenantContext.setTenantId(previousTenantId);
        }
    }

    @PostMapping("/poll")
    public R<WorkflowProviderExecuteVO> poll(
        @RequestHeader(value = "X-Workflow-Token", required = false) String token,
        @Valid @RequestBody WorkflowProviderPollDTO dto
    ) {
        requireInternalToken(token);
        Integer previousTenantId = TenantContext.getTenantId();
        TenantContext.setTenantId(dto.getTenantId());
        try {
            return R.ok(gatewayService.poll(dto));
        } finally {
            if (previousTenantId == null) TenantContext.clear();
            else TenantContext.setTenantId(previousTenantId);
        }
    }

    private void requireInternalToken(String token) {
        if (!StringUtils.hasText(gatewayToken) || !StringUtils.hasText(token)
            || !MessageDigest.isEqual(
                gatewayToken.getBytes(StandardCharsets.UTF_8),
                token.getBytes(StandardCharsets.UTF_8)
            )) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "工作流内部调用凭证无效");
        }
    }
}
