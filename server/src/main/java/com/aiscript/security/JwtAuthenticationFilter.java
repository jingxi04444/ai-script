package com.aiscript.security;

import com.aiscript.common.constant.SecurityConstants;
import com.aiscript.framework.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider jwtTokenProvider;
    private final PermissionService permissionService;
    private final TokenBlacklistService tokenBlacklistService;

    public JwtAuthenticationFilter(
        JwtTokenProvider jwtTokenProvider,
        PermissionService permissionService,
        TokenBlacklistService tokenBlacklistService
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.permissionService = permissionService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader(SecurityConstants.AUTH_HEADER);
        if (StringUtils.hasText(header) && header.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            String token = header.substring(SecurityConstants.TOKEN_PREFIX.length());
            if (tokenBlacklistService.isRevoked(token)) {
                filterChain.doFilter(request, response);
                return;
            }
            Claims claims;
            try {
                claims = jwtTokenProvider.parseClaims(token);
            } catch (RuntimeException ex) {
                if (isPublicRequest(request)) {
                    filterChain.doFilter(request, response);
                    return;
                }
                throw ex;
            }
            Integer userId = Integer.valueOf(claims.getSubject());
            Integer tenantId = claims.get("tenantId", Integer.class);
            LoginUser loginUser = LoginUser.builder()
                .userId(userId)
                .tenantId(tenantId)
                .account(claims.get("account", String.class))
                .userType(claims.get("userType", String.class))
                .permissions(permissionService.loadPermissions(userId, claims.get("userType", String.class)))
                .build();
            TenantContext.setTenantId(tenantId);
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                loginUser,
                null,
                loginUser.getPermissions().stream().map(SimpleGrantedAuthority::new).toList()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private boolean isPublicRequest(HttpServletRequest request) {
        return HttpMethod.GET.matches(request.getMethod())
            && ("/api/site-config".equals(request.getRequestURI())
                || "/api/script-formats".equals(request.getRequestURI())
                || "/api/home-banners".equals(request.getRequestURI()));
    }
}
