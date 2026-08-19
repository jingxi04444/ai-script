package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.vo.DailyPointRewardVO;
import com.aiscript.modules.membership.vo.PointAccountVO;
import com.aiscript.modules.membership.vo.PointOperationCostsVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/membership/points")
public class MembershipPointController {
    private final MembershipPointService pointService;

    public MembershipPointController(MembershipPointService pointService) {
        this.pointService = pointService;
    }

    @GetMapping
    public R<PointAccountVO> account() {
        LoginUser user = currentUser();
        return R.ok(pointService.account(user.getTenantId(), user.getUserId()));
    }

    @GetMapping("/costs")
    public R<PointOperationCostsVO> operationCosts() {
        LoginUser user = currentUser();
        return R.ok(pointService.operationCosts(user.getTenantId(), user.getUserId()));
    }

    @GetMapping("/transactions")
    public R<PageResult<PointTransactionVO>> transactions(@Valid PageQuery query) {
        LoginUser user = currentUser();
        return R.ok(pointService.transactions(user.getUserId(), query));
    }

    @PostMapping("/daily-reward")
    public R<DailyPointRewardVO> claimDailyReward() {
        LoginUser user = currentUser();
        return R.ok(pointService.claimDailyReward(user.getTenantId(), user.getUserId()));
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}
