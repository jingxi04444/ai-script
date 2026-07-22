package com.aiscript.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
    private final SecretKey secretKey;
    private final Duration accessTokenExpire;

    public JwtTokenProvider(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.access-token-expire-minutes}") long accessTokenExpireMinutes
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpire = Duration.ofMinutes(accessTokenExpireMinutes);
    }

    public String createAccessToken(LoginUser loginUser) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(String.valueOf(loginUser.getUserId()))
            .claim("tenantId", loginUser.getTenantId())
            .claim("account", loginUser.getAccount())
            .claim("userType", loginUser.getUserType())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(accessTokenExpire)))
            .signWith(secretKey)
            .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
