package com.aiscript.integration.viral;

import java.util.Set;

public interface ViralSearchClient {
    ViralSearchResult search(Integer tenantId, String category, Set<String> platforms);

    CookieValidationResult validateCookie(Integer tenantId, String platform);
}
