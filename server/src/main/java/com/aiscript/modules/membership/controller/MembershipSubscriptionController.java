package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.dto.SubscriptionChangeDTO;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.service.MembershipSubscriptionService;
import com.aiscript.modules.membership.vo.MembershipChangeQuoteVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/membership/subscription")
public class MembershipSubscriptionController {
    private final MembershipSubscriptionService subscriptionService;
    private final MembershipService membershipService;

    public MembershipSubscriptionController(
        MembershipSubscriptionService subscriptionService,
        MembershipService membershipService
    ) {
        this.subscriptionService = subscriptionService;
        this.membershipService = membershipService;
    }

    @GetMapping("/quote")
    public R<MembershipChangeQuoteVO> quote(@RequestParam String skuId) {
        LoginUser user = currentUser();
        return R.ok(subscriptionService.quote(
            user.getTenantId(), user.getUserId(), parseId(skuId)
        ));
    }

    @PostMapping("/downgrade")
    public R<UserMembershipVO> scheduleDowngrade(@Valid @RequestBody SubscriptionChangeDTO dto) {
        LoginUser user = currentUser();
        subscriptionService.scheduleDowngrade(
            user.getTenantId(), user.getUserId(), parseId(dto.getSkuId())
        );
        return R.ok(membershipService.currentMembership());
    }

    @PostMapping("/downgrade/revoke")
    public R<UserMembershipVO> revokeScheduledDowngrade() {
        LoginUser user = currentUser();
        subscriptionService.revokeScheduledDowngrade(user.getTenantId(), user.getUserId());
        return R.ok(membershipService.currentMembership());
    }

    @PostMapping("/cancel-renewal")
    public R<UserMembershipVO> cancelRenewal() {
        LoginUser user = currentUser();
        subscriptionService.cancelAtPeriodEnd(user.getTenantId(), user.getUserId());
        return R.ok(membershipService.currentMembership());
    }

    private Long parseId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            throw new BusinessException("会员SKU格式不正确");
        }
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}