package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.membership.dto.TemplateCustomRequestCreateDTO;
import com.aiscript.modules.membership.service.TemplateCustomRequestService;
import com.aiscript.modules.membership.vo.TemplateCustomRequestVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/membership/template-custom-requests")
public class TemplateCustomRequestController {
    private final TemplateCustomRequestService requestService;

    public TemplateCustomRequestController(TemplateCustomRequestService requestService) {
        this.requestService = requestService;
    }

    @PostMapping
    public R<TemplateCustomRequestVO> create(@Valid @RequestBody TemplateCustomRequestCreateDTO dto) {
        LoginUser user = currentUser();
        return R.ok(requestService.create(currentTenantId(), user.getUserId(), dto));
    }

    @GetMapping
    public R<PageResult<TemplateCustomRequestVO>> mine(@Valid PageQuery query) {
        LoginUser user = currentUser();
        return R.ok(requestService.mine(currentTenantId(), user.getUserId(), query));
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? 1 : TenantContext.getTenantId();
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}
