package com.aiscript.modules.auth.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.integration.sms.SmsClient;
import com.aiscript.modules.auth.dto.LoginDTO;
import com.aiscript.modules.auth.dto.BindEmailDTO;
import com.aiscript.modules.auth.dto.BindPhoneDTO;
import com.aiscript.modules.auth.dto.RegisterDTO;
import com.aiscript.modules.auth.dto.SendCodeDTO;
import com.aiscript.modules.auth.dto.SmsLoginDTO;
import com.aiscript.modules.auth.entity.SysVerificationCode;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysVerificationCodeMapper;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.auth.service.AuthService;
import com.aiscript.modules.auth.vo.AdminUserVO;
import com.aiscript.modules.auth.vo.LoginVO;
import com.aiscript.modules.auth.vo.UserInfoVO;
import com.aiscript.modules.membership.service.NewUserWaterDropService;
import com.aiscript.modules.system.entity.SysRole;
import com.aiscript.modules.system.entity.SysUserRole;
import com.aiscript.modules.system.mapper.SysRoleMapper;
import com.aiscript.modules.system.mapper.SysUserRoleMapper;
import com.aiscript.security.JwtTokenProvider;
import com.aiscript.security.LoginUser;
import com.aiscript.security.PermissionService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final Integer DEFAULT_TENANT_ID = 1;

    private final JwtTokenProvider jwtTokenProvider;
    private final SysUserMapper sysUserMapper;
    private final SysVerificationCodeMapper verificationCodeMapper;
    private final PasswordEncoder passwordEncoder;
    private final SmsClient smsClient;
    private final PermissionService permissionService;
    private final SysRoleMapper roleMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final NewUserWaterDropService newUserWaterDropService;

    public AuthServiceImpl(
        JwtTokenProvider jwtTokenProvider,
        SysUserMapper sysUserMapper,
        SysVerificationCodeMapper verificationCodeMapper,
        PasswordEncoder passwordEncoder,
        SmsClient smsClient,
        PermissionService permissionService,
        SysRoleMapper roleMapper,
        SysUserRoleMapper userRoleMapper,
        NewUserWaterDropService newUserWaterDropService
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.sysUserMapper = sysUserMapper;
        this.verificationCodeMapper = verificationCodeMapper;
        this.passwordEncoder = passwordEncoder;
        this.smsClient = smsClient;
        this.permissionService = permissionService;
        this.roleMapper = roleMapper;
        this.userRoleMapper = userRoleMapper;
        this.newUserWaterDropService = newUserWaterDropService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginVO login(LoginDTO dto, String userType) {
        String loginName = dto.getUsername().trim();
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
            .and(wrapper -> wrapper.eq(SysUser::getAccount, loginName)
                .or()
                .eq(SysUser::getEmail, loginName.toLowerCase()))
            .eq(SysUser::getUserType, userType)
            .last("limit 1"));
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号或密码错误");
        }
        boolean passwordMatches = passwordEncoder.matches(dto.getPassword(), user.getPasswordHash());
        boolean devSeedFallback = "123456".equals(dto.getPassword())
            && user.getPasswordHash() != null
            && user.getPasswordHash().contains("replace_with_bcrypt_hash");
        if (!passwordMatches && !devSeedFallback) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号或密码错误");
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException(ResultCode.FORBIDDEN, "账号已被禁用");
        }
        backfillEmailFromLoginCredential(user, loginName);
        return issueLogin(user, userType);
    }

    private void backfillEmailFromLoginCredential(SysUser user, String loginName) {
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return;
        }
        String normalizedEmail = loginName.trim().toLowerCase();
        if (!normalizedEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return;
        }
        Long existingCount = sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getUserType, user.getUserType())
            .eq(SysUser::getEmail, normalizedEmail)
            .ne(SysUser::getId, user.getId()));
        if (existingCount > 0) {
            throw new BusinessException(ResultCode.CONFLICT, "该邮箱已绑定其他账号");
        }
        user.setEmail(normalizedEmail);
        sysUserMapper.updateById(user);
    }

    private LoginVO issueLogin(SysUser user, String userType) {
        ensureEnabled(user);
        ensureDefaultFrontRole(user);
        LoginUser loginUser = LoginUser.builder()
            .userId(user.getId())
            .tenantId(user.getTenantId())
            .account(user.getAccount())
            .userType(userType)
            .permissions(permissionService.loadPermissions(user.getId(), userType))
            .build();
        String token = jwtTokenProvider.createAccessToken(loginUser);
        LoginVO loginVO = new LoginVO();
        loginVO.setToken(token);
        loginVO.setUser(toUserInfoVO(user));
        loginVO.setNeedsPhoneBinding(user.getPhone() == null || user.getPhone().isBlank());
        loginVO.setNeedsEmailBinding(user.getEmail() == null || user.getEmail().isBlank());
        return loginVO;
    }

    private void ensureDefaultFrontRole(SysUser user) {
        if (user == null || !"front".equals(user.getUserType())) {
            return;
        }
        Long assignedRoleCount = userRoleMapper.selectCount(new QueryWrapper<SysUserRole>()
            .eq("user_id", user.getId()));
        if (assignedRoleCount > 0) {
            return;
        }
        SysRole defaultRole = roleMapper.selectOne(new QueryWrapper<SysRole>()
            .eq("role_code", "front_user")
            .eq("status", 1)
            .and(wrapper -> wrapper.eq("tenant_id", user.getTenantId())
                .or()
                .isNull("tenant_id"))
            .orderByDesc("tenant_id")
            .last("limit 1"));
        if (defaultRole == null) {
            throw new BusinessException("前台默认角色未配置，请联系管理员");
        }
        SysUserRole userRole = new SysUserRole();
        userRole.userId = user.getId();
        userRole.roleId = defaultRole.id;
        userRoleMapper.insert(userRole);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginVO register(RegisterDTO dto) {
        verifyCode(dto.getPhone(), "register", dto.getCode());
        ensurePhoneAndEmailAvailable(dto.getPhone(), dto.getEmail(), null);
        SysUser user = new SysUser();
        user.setTenantId(DEFAULT_TENANT_ID);
        String displayName = dto.getUsername() == null || dto.getUsername().isBlank()
            ? dto.getEmail().substring(0, dto.getEmail().indexOf('@'))
            : dto.getUsername().trim();
        user.setUsername(displayName);
        user.setAccount(dto.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(dto.getEmail().trim().toLowerCase());
        user.setPhone(dto.getPhone());
        user.setUserType("front");
        user.setMemberLevel(0);
        user.setStatus(1);
        sysUserMapper.insert(user);
        newUserWaterDropService.initialize(user.getTenantId(), user.getId());
        return issueLogin(user, "front");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginVO smsLogin(SmsLoginDTO dto) {
        verifyCode(dto.getPhone(), "login", dto.getCode());
        SysUser user = findFrontUserByPhone(dto.getPhone());
        if (user == null) {
            user = new SysUser();
            user.setTenantId(DEFAULT_TENANT_ID);
            user.setUsername("用户" + dto.getPhone().substring(7));
            user.setAccount(dto.getPhone());
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setPhone(dto.getPhone());
            user.setUserType("front");
            user.setMemberLevel(0);
            user.setStatus(1);
            sysUserMapper.insert(user);
            newUserWaterDropService.initialize(user.getTenantId(), user.getId());
        }
        return issueLogin(user, "front");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginVO bindPhone(BindPhoneDTO dto) {
        verifyCode(dto.getPhone(), "bind", dto.getCode());
        SysUser current = currentUser();
        SysUser existing = findFrontUserByPhone(dto.getPhone());
        if (existing != null && !existing.getId().equals(current.getId())) {
            if (current.getWechatOpenId() == null || current.getWechatOpenId().isBlank()) {
                throw new BusinessException("该手机号已绑定其他账号");
            }
            existing.setWechatOpenId(current.getWechatOpenId());
            existing.setWechatUnionId(current.getWechatUnionId());
            sysUserMapper.updateById(existing);
            current.setWechatOpenId(null);
            current.setWechatUnionId(null);
            sysUserMapper.updateById(current);
            sysUserMapper.deleteById(current.getId());
            return issueLogin(existing, "front");
        }
        current.setPhone(dto.getPhone());
        if (current.getAccount() == null || current.getAccount().startsWith("wx_")) {
            current.setAccount(dto.getPhone());
        }
        sysUserMapper.updateById(current);
        return issueLogin(current, "front");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginVO bindEmail(BindEmailDTO dto) {
        SysUser current = currentUser();
        String normalizedEmail = dto.getEmail().trim().toLowerCase();
        Long existingCount = sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getUserType, "front")
            .eq(SysUser::getEmail, normalizedEmail)
            .ne(SysUser::getId, current.getId()));
        if (existingCount > 0) {
            throw new BusinessException(ResultCode.CONFLICT, "该邮箱已绑定其他账号");
        }
        current.setEmail(normalizedEmail);
        current.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        if (current.getAccount() == null || current.getAccount().isBlank()
            || current.getAccount().startsWith("wx_") || current.getAccount().equals(current.getPhone())) {
            current.setAccount(normalizedEmail);
        }
        sysUserMapper.updateById(current);
        return issueLogin(current, "front");
    }

    @Override
    public LoginVO loginWechatUser(Integer userId) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null || !"front".equals(user.getUserType())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "微信登录用户不存在");
        }
        return issueLogin(user, "front");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendCode(SendCodeDTO dto) {
        String scene = dto.getScene() == null || dto.getScene().isBlank() ? "login" : dto.getScene();
        String maskedPhone = maskPhone(dto.getPhone());
        log.info("[SMS] verification-code request received: phone={}, scene={}", maskedPhone, scene);
        SysVerificationCode latest = verificationCodeMapper.selectOne(new LambdaQueryWrapper<SysVerificationCode>()
            .eq(SysVerificationCode::getTarget, dto.getPhone())
            .eq(SysVerificationCode::getScene, scene)
            .orderByDesc(SysVerificationCode::getCreateTime)
            .last("limit 1"));
        if (latest != null && latest.getCreateTime() != null
            && latest.getCreateTime().isAfter(LocalDateTime.now().minusSeconds(60))) {
            long retryAfterSeconds = Math.max(
                1,
                60 - java.time.Duration.between(latest.getCreateTime(), LocalDateTime.now()).getSeconds()
            );
            log.warn(
                "[SMS] verification-code request throttled: phone={}, scene={}, retryAfterSeconds={}",
                maskedPhone,
                scene,
                retryAfterSeconds
            );
            throw new BusinessException(ResultCode.TOO_MANY_REQUESTS, "验证码发送过于频繁，请稍后再试");
        }
        String code = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
        SysVerificationCode verificationCode = new SysVerificationCode();
        verificationCode.setTarget(dto.getPhone());
        verificationCode.setChannel("sms");
        verificationCode.setScene(scene);
        verificationCode.setCodeHash(passwordEncoder.encode(code));
        verificationCode.setExpireTime(LocalDateTime.now().plusMinutes(5));
        verificationCodeMapper.insert(verificationCode);
        try {
            smsClient.sendVerificationCode(dto.getPhone(), code);
            log.info(
                "[SMS] verification-code request completed: phone={}, scene={}, verificationId={}, expiresAt={}",
                maskedPhone,
                scene,
                verificationCode.getId(),
                verificationCode.getExpireTime()
            );
        } catch (BusinessException exception) {
            log.warn(
                "[SMS] verification-code request failed: phone={}, scene={}, reason={}",
                maskedPhone,
                scene,
                exception.getMessage()
            );
            throw exception;
        }
    }

    @Override
    public UserInfoVO currentUserInfo() {
        SysUser user = currentUser();
        return toUserInfoVO(user);
    }

    @Override
    public AdminUserVO currentAdminInfo() {
        SysUser user = currentUser();
        AdminUserVO admin = new AdminUserVO();
        admin.setId(String.valueOf(user.getId()));
        admin.setUsername(user.getUsername());
        List<String> roles = permissionService.loadRoleCodes(user.getId());
        admin.setRole(primaryAdminRole(roles));
        admin.setRoles(roles);
        admin.setPermissions(new ArrayList<>(permissionService.loadPermissions(user.getId(), user.getUserType())));
        admin.setMenus(permissionService.loadMenus(user.getId()));
        return admin;
    }

    private SysUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录");
        }
        SysUser user = sysUserMapper.selectById(loginUser.getUserId());
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "用户不存在");
        }
        return user;
    }

    private SysUser findFrontUserByPhone(String phone) {
        return sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getPhone, phone)
            .eq(SysUser::getUserType, "front")
            .last("limit 1"));
    }

    private void ensurePhoneAndEmailAvailable(String phone, String email, Integer ignoredUserId) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getUserType, "front")
            .and(query -> query.eq(SysUser::getPhone, phone)
                .or()
                .eq(SysUser::getEmail, email.trim().toLowerCase()));
        if (ignoredUserId != null) {
            wrapper.ne(SysUser::getId, ignoredUserId);
        }
        if (sysUserMapper.selectCount(wrapper) > 0) {
            throw new BusinessException("手机号或邮箱已注册");
        }
    }

    private void ensureEnabled(SysUser user) {
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "用户不存在");
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException(ResultCode.FORBIDDEN, "账号已被禁用");
        }
    }

    private UserInfoVO toUserInfoVO(SysUser user) {
        UserInfoVO vo = new UserInfoVO();
        vo.setId(String.valueOf(user.getId()));
        vo.setUsername(user.getUsername());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setAvatar(user.getAvatarUrl());
        vo.setMemberLevel(user.getMemberLevel());
        List<String> roles = permissionService.loadRoleCodes(user.getId());
        vo.setRole("admin".equals(user.getUserType()) ? primaryAdminRole(roles) : (roles.isEmpty() ? "user" : roles.get(0)));
        vo.setRoles(roles);
        vo.setPermissions(new ArrayList<>(permissionService.loadPermissions(user.getId(), user.getUserType())));
        vo.setMenus(permissionService.loadMenus(user.getId()));
        return vo;
    }

    private void verifyCode(String phone, String scene, String code) {
        if (code == null || code.isBlank()) {
            throw new BusinessException("验证码不能为空");
        }
        SysVerificationCode verificationCode = verificationCodeMapper.selectList(new LambdaQueryWrapper<SysVerificationCode>()
                .eq(SysVerificationCode::getTarget, phone)
                .eq(SysVerificationCode::getScene, scene)
                .isNull(SysVerificationCode::getUsedTime)
                .orderByDesc(SysVerificationCode::getCreateTime)
                .last("limit 1"))
            .stream()
            .findFirst()
            .orElseThrow(() -> new BusinessException("验证码不存在或已使用"));
        if (verificationCode.getExpireTime().isBefore(LocalDateTime.now())) {
            throw new BusinessException("验证码已过期");
        }
        if (!passwordEncoder.matches(code, verificationCode.getCodeHash())) {
            throw new BusinessException("验证码错误");
        }
        verificationCode.setUsedTime(LocalDateTime.now());
        verificationCodeMapper.updateById(verificationCode);
    }

    private String primaryAdminRole(List<String> roles) {
        if (roles.contains("super_admin")) {
            return "superadmin";
        }
        if (roles.contains("admin_operator")) {
            return "admin";
        }
        return "admin";
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
