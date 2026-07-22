package com.aiscript.framework.tenant;

import org.springframework.stereotype.Component;

@Component
public class TenantInterceptor {
    public Integer currentTenantId() {
        return TenantContext.getTenantId();
    }
}
