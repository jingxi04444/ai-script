package com.aiscript.modules.user.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.user.dto.UserQueryDTO;
import com.aiscript.modules.user.dto.InternalMembershipAdjustDTO;
import com.aiscript.modules.user.dto.InternalUserCreateDTO;
import com.aiscript.modules.user.service.UserAdminService;
import com.aiscript.modules.user.vo.UserVO;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final UserAdminService userAdminService;

    public AdminUserController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    public R<PageResult<UserVO>> list(UserQueryDTO query) {
        return R.ok(userAdminService.page(query));
    }

    @GetMapping("/{id}")
    public R<UserVO> getById(@PathVariable Integer id) {
        return R.ok(userAdminService.getById(id));
    }

    @PutMapping("/{id}")
    public R<UserVO> update(@PathVariable Integer id, @RequestBody UserVO payload) {
        return R.ok(userAdminService.update(id, payload));
    }

    @PostMapping("/internal")
    public R<UserVO> createInternal(@Valid @RequestBody InternalUserCreateDTO dto) {
        LoginUser operator = currentUser();
        return R.ok(userAdminService.createInternalAccount(dto, operator.getUserId(), operator.getTenantId()));
    }

    @PutMapping("/{id}/internal-membership")
    public R<UserVO> adjustInternalMembership(
        @PathVariable Integer id,
        @Valid @RequestBody InternalMembershipAdjustDTO dto
    ) {
        LoginUser operator = currentUser();
        return R.ok(userAdminService.adjustInternalMembership(id, dto, operator.getUserId()));
    }

    @PostMapping("/{id}/disable")
    public R<Void> disable(@PathVariable Integer id) {
        userAdminService.disable(id);
        return R.ok();
    }

    @PostMapping("/{id}/enable")
    public R<Void> enable(@PathVariable Integer id) {
        userAdminService.enable(id);
        return R.ok();
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}
