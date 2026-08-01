package com.aiscript.modules.auth.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.auth.dto.LoginDTO;
import com.aiscript.modules.auth.dto.BindPhoneDTO;
import com.aiscript.modules.auth.dto.RegisterDTO;
import com.aiscript.modules.auth.dto.SendCodeDTO;
import com.aiscript.modules.auth.dto.SmsLoginDTO;
import com.aiscript.modules.auth.service.AuthService;
import com.aiscript.modules.auth.service.WechatAuthService;
import com.aiscript.modules.auth.vo.LoginVO;
import com.aiscript.modules.auth.vo.UserInfoVO;
import com.aiscript.modules.auth.vo.WechatLoginStartVO;
import com.aiscript.modules.auth.vo.WechatLoginStatusVO;
import com.aiscript.security.TokenBlacklistService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final WechatAuthService wechatAuthService;
    private final TokenBlacklistService tokenBlacklistService;

    public AuthController(AuthService authService, WechatAuthService wechatAuthService,
        TokenBlacklistService tokenBlacklistService) {
        this.authService = authService;
        this.wechatAuthService = wechatAuthService;
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

    @PostMapping("/sms-login")
    public R<LoginVO> smsLogin(@Valid @RequestBody SmsLoginDTO dto) {
        return R.ok(authService.smsLogin(dto));
    }

    @PostMapping("/bind-phone")
    public R<LoginVO> bindPhone(@Valid @RequestBody BindPhoneDTO dto) {
        return R.ok(authService.bindPhone(dto));
    }

    @PostMapping("/send-code")
    public R<Void> sendCode(@Valid @RequestBody SendCodeDTO dto) {
        authService.sendCode(dto);
        return R.ok();
    }

    @PostMapping("/wechat/start")
    public R<WechatLoginStartVO> startWechatLogin() {
        return R.ok(wechatAuthService.start());
    }

    @GetMapping("/wechat/status")
    public R<WechatLoginStatusVO> wechatLoginStatus(@RequestParam String state) {
        return R.ok(wechatAuthService.status(state));
    }

    @GetMapping(value = "/wechat/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> wechatCallback(@RequestParam String code, @RequestParam String state) {
        wechatAuthService.callback(code, state);
        return ResponseEntity.ok("<!doctype html><html><meta charset=\"utf-8\"><body style=\"font-family:sans-serif;text-align:center;padding:48px\">扫码成功，请返回 AI Script 完成登录。</body></html>");
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
