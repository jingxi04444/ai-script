package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.service.NewUserWaterDropService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NewUserWaterDropServiceImpl implements NewUserWaterDropService {
    static final String WELCOME_POINT_BENEFIT = "NEW_USER_WELCOME_POINT";

    private final MembershipEntitlementService entitlementService;
    private final MembershipPointService pointService;

    public NewUserWaterDropServiceImpl(
        MembershipEntitlementService entitlementService,
        MembershipPointService pointService
    ) {
        this.entitlementService = entitlementService;
        this.pointService = pointService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void initialize(Integer tenantId, Integer userId) {
        if (userId == null) {
            throw new BusinessException("新用户水滴初始化缺少用户ID");
        }

        long welcomePoints = entitlementService.getLimit(tenantId, userId, WELCOME_POINT_BENEFIT);
        // 即使后台把赠送值设为 0，也为新用户准备好空账户，前端可以稳定读取余额。
        pointService.account(tenantId, userId);
        if (welcomePoints <= 0) {
            return;
        }

        pointService.grantPoints(
            tenantId,
            userId,
            welcomePoints,
            "reward",
            "new_user_welcome:" + userId,
            "new_user_welcome",
            userId.longValue(),
            null,
            "新用户注册赠送铼河水滴"
        );
    }
}
