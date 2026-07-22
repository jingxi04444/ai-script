package com.aiscript.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;
import java.util.function.Supplier;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

@Component
public class DynamicAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {
    private final PermissionService permissionService;

    public DynamicAuthorizationManager(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authenticationSupplier, RequestAuthorizationContext context) {
        Authentication authentication = authenticationSupplier.get();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            return new AuthorizationDecision(false);
        }
        HttpServletRequest request = context.getRequest();
        String path = request.getRequestURI();
        if (path.startsWith("/api/admin/") && !"admin".equals(loginUser.getUserType())) {
            return new AuthorizationDecision(false);
        }
        Set<String> requiredPermissions = permissionService.requiredApiPermissions(path);
        if (requiredPermissions.isEmpty()) {
            return new AuthorizationDecision(true);
        }
        boolean granted = requiredPermissions.stream().anyMatch(loginUser.getPermissions()::contains);
        return new AuthorizationDecision(granted);
    }
}
