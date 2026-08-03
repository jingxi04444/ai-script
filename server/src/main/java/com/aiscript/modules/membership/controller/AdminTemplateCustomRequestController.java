package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminTemplateCustomRequestUpdateDTO;
import com.aiscript.modules.membership.service.TemplateCustomRequestService;
import com.aiscript.modules.membership.vo.TemplateCustomRequestVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/membership/template-custom-requests")
public class AdminTemplateCustomRequestController {
    private final TemplateCustomRequestService requestService;

    public AdminTemplateCustomRequestController(TemplateCustomRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public R<PageResult<TemplateCustomRequestVO>> page(
        @Valid PageQuery query,
        @RequestParam(required = false) String status
    ) {
        currentUser();
        return R.ok(requestService.adminPage(query, status));
    }

    @PutMapping("/{id}")
    public R<TemplateCustomRequestVO> update(
        @PathVariable Long id,
        @Valid @RequestBody AdminTemplateCustomRequestUpdateDTO dto
    ) {
        LoginUser user = currentUser();
        return R.ok(requestService.update(id, dto, user.getUserId()));
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}
