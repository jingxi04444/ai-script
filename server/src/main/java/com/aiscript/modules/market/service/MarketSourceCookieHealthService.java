package com.aiscript.modules.market.service;

public interface MarketSourceCookieHealthService {
    void validateCurrentTenant(String platform);

    void validateAllEnabled();
}
