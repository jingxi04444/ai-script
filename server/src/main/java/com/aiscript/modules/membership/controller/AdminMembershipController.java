package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminMembershipPlanUpdateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipSkuUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPlanBenefitUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPointAdjustDTO;
import com.aiscript.modules.membership.service.AdminMembershipService;
import com.aiscript.modules.membership.vo.AdminSubscriptionVO;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/membership")
public class AdminMembershipController {
    private final AdminMembershipService adminMembershipService;

    public AdminMembershipController(AdminMembershipService adminMembershipService) {
        this.adminMembershipService = adminMembershipService;
    }

    @GetMapping("/plans")
    public R<List<MembershipPlanVO>> plans() {
        currentUser();
        return R.ok(adminMembershipService.plans());
    }

    @PutMapping("/plans/{id}")
    public R<MembershipPlanVO> updatePlan(
        @PathVariable Long id,
        @Valid @RequestBody AdminMembershipPlanUpdateDTO dto
    ) {
        currentUser();
        return R.ok(adminMembershipService.updatePlan(id, dto));
    }

    @PutMapping("/skus/{id}")
    public R<MembershipPlanVO> updateSku(
        @PathVariable Long id,
        @Valid @RequestBody AdminMembershipSkuUpdateDTO dto
    ) {
        currentUser();
        return R.ok(adminMembershipService.updateSku(id, dto));
    }

    @PutMapping("/plans/{planId}/benefits/{benefitCode}")
    public R<MembershipPlanVO> updatePlanBenefit(
        @PathVariable Long planId,
        @PathVariable String benefitCode,
        @Valid @RequestBody AdminPlanBenefitUpdateDTO dto
    ) {
        currentUser();
        return R.ok(adminMembershipService.updatePlanBenefit(planId, benefitCode, dto));
    }

    @GetMapping("/subscriptions")
    public R<PageResult<AdminSubscriptionVO>> subscriptions(
        @Valid PageQuery query,
        @RequestParam(required = false) String status
    ) {
        currentUser();
        return R.ok(adminMembershipService.subscriptions(query, status));
    }

    @PostMapping("/points/adjust")
    public R<PointTransactionVO> adjustPoints(@Valid @RequestBody AdminPointAdjustDTO dto) {
        LoginUser user = currentUser();
        return R.ok(adminMembershipService.adjustPoints(dto, user.getUserId()));
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}
