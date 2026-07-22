package com.aiscript.modules.auth.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.auth.dto.LoginDTO;
import com.aiscript.modules.auth.service.AuthService;
import com.aiscript.modules.auth.vo.AdminUserVO;
import com.aiscript.modules.auth.vo.LoginVO;
import com.aiscript.security.TokenBlacklistService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {
    private final AuthService authService;
    private final TokenBlacklistService tokenBlacklistService;

    public AdminAuthController(AuthService authService, TokenBlacklistService tokenBlacklistService) {
        this.authService = authService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    @PostMapping("/login")
    public R<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        return R.ok(authService.login(dto, "admin"));
    }

    @PostMapping("/logout")
    public R<Void> logout(HttpServletRequest request) {
        tokenBlacklistService.revoke(resolveToken(request));
        return R.ok();
    }

    @GetMapping("/admin-info")
    public R<AdminUserVO> adminInfo() {
        return R.ok(authService.currentAdminInfo());
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring("Bearer ".length());
        }
        return null;
    }
}
