package com.aiscript.modules.auth.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.auth.dto.LoginDTO;
import com.aiscript.modules.auth.dto.RegisterDTO;
import com.aiscript.modules.auth.dto.SendCodeDTO;
import com.aiscript.modules.auth.service.AuthService;
import com.aiscript.modules.auth.vo.LoginVO;
import com.aiscript.modules.auth.vo.UserInfoVO;
import com.aiscript.security.TokenBlacklistService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final TokenBlacklistService tokenBlacklistService;

    public AuthController(AuthService authService, TokenBlacklistService tokenBlacklistService) {
        this.authService = authService;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    @PostMapping("/login")
    public R<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        return R.ok(authService.login(dto, "front"));
    }

    @PostMapping("/register")
    public R<LoginVO> register(@Valid @RequestBody RegisterDTO dto) {
        return R.ok(authService.register(dto));
    }

    @PostMapping("/send-code")
    public R<Void> sendCode(@Valid @RequestBody SendCodeDTO dto) {
        authService.sendCode(dto);
        return R.ok();
    }

    @PostMapping("/logout")
    public R<Void> logout(HttpServletRequest request) {
        tokenBlacklistService.revoke(resolveToken(request));
        return R.ok();
    }

    @GetMapping("/user-info")
    public R<UserInfoVO> userInfo() {
        return R.ok(authService.currentUserInfo());
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring("Bearer ".length());
        }
        return null;
    }
}
