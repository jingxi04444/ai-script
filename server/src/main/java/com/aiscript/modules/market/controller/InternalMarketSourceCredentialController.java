package com.aiscript.modules.market.controller;

import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.market.dto.MarketSourceCredentialDTO;
import com.aiscript.modules.market.service.MarketSourceConfigService;
import com.aiscript.modules.market.vo.MarketSourceCredentialVO;
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
public class InternalMarketSourceCredentialController {
    private final MarketSourceConfigService configService;
    private final String gatewayToken;

    public InternalMarketSourceCredentialController(
        MarketSourceConfigService configService,
        @Value("${aiscript.workflow.provider-gateway.token:}") String gatewayToken
    ) {
        this.configService = configService;
        this.gatewayToken = gatewayToken;
    }

    @PostMapping("/market-source-credential")
    public R<MarketSourceCredentialVO> credential(
        @RequestHeader(value = "X-Workflow-Token", required = false) String token,
        @Valid @RequestBody MarketSourceCredentialDTO dto
    ) {
        requireInternalToken(token);
        return R.ok(configService.credential(dto.getTenantId(), dto.getPlatform()));
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
