package com.aiscript.modules.market.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.integration.viral.CookieValidationResult;
import com.aiscript.integration.viral.ViralSearchClient;
import com.aiscript.modules.market.entity.SysMarketSourceConfig;
import com.aiscript.modules.market.service.MarketSourceConfigService;
import com.aiscript.modules.market.service.MarketSourceCookieHealthService;
import com.aiscript.security.LoginUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MarketSourceCookieHealthServiceImpl implements MarketSourceCookieHealthService {
    private final MarketSourceConfigService configService;
    private final ViralSearchClient viralSearchClient;

    public MarketSourceCookieHealthServiceImpl(
        MarketSourceConfigService configService,
        ViralSearchClient viralSearchClient
    ) {
        this.configService = configService;
        this.viralSearchClient = viralSearchClient;
    }

    @Override
    public void validateCurrentTenant(String platform) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录管理员账号");
        }
        validate(user.getTenantId() == null ? 1 : user.getTenantId(), platform);
    }

    @Override
    public void validateAllEnabled() {
        for (SysMarketSourceConfig source : configService.listEnabledSources()) {
            try {
                validate(source.getTenantId(), source.getPlatform());
            } catch (RuntimeException exception) {
                log.warn(
                    "Market source cookie probe failed: tenantId={}, platform={}, reason={}",
                    source.getTenantId(), source.getPlatform(), exception.getMessage()
                );
            }
        }
    }

    private void validate(Integer tenantId, String platform) {
        try {
            CookieValidationResult result = viralSearchClient.validateCookie(tenantId, platform);
            configService.recordValidation(
                tenantId, platform, result.valid(), result.errorMessage()
            );
        } catch (RuntimeException exception) {
            // A Python service/network outage does not prove the platform Cookie expired.
            log.warn(
                "Market source cookie probe unavailable: tenantId={}, platform={}, reason={}",
                tenantId, platform, exception.getMessage()
            );
            throw exception;
        }
    }
}
