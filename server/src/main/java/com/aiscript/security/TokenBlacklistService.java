package com.aiscript.security;

import io.jsonwebtoken.Claims;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class TokenBlacklistService {
    private final JwtTokenProvider jwtTokenProvider;
    private final Map<String, Instant> revokedTokens = new ConcurrentHashMap<>();

    public TokenBlacklistService(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public void revoke(String token) {
        if (!StringUtils.hasText(token)) {
            return;
        }
        Claims claims = jwtTokenProvider.parseClaims(token);
        Date expiration = claims.getExpiration();
        if (expiration != null && expiration.toInstant().isAfter(Instant.now())) {
            revokedTokens.put(token, expiration.toInstant());
        }
        cleanup();
    }

    public boolean isRevoked(String token) {
        if (!StringUtils.hasText(token)) {
            return false;
        }
        Instant expiration = revokedTokens.get(token);
        if (expiration == null) {
            return false;
        }
        if (!expiration.isAfter(Instant.now())) {
            revokedTokens.remove(token);
            return false;
        }
        return true;
    }

    private void cleanup() {
        Instant now = Instant.now();
        revokedTokens.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
    }
}
