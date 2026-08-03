package com.aiscript.modules.membership.service.impl;

import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipTaskQuotaService;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class MembershipTaskQuotaServiceImpl implements MembershipTaskQuotaService {
    private final MembershipEntitlementService entitlementService;

    public MembershipTaskQuotaServiceImpl(MembershipEntitlementService entitlementService) {
        this.entitlementService = entitlementService;
    }

    @Override
    public String reserve(Integer tenantId, Integer userId, String taskType, String businessKey) {
        String requestNo = "task_concurrency:" + userId + ":" + taskType + ":"
            + UUID.randomUUID().toString().replace("-", "");
        entitlementService.reserveQuota(
            tenantId, userId, "TASK_CONCURRENCY_LIMIT", 1,
            requestNo, taskType, null
        );
        return requestNo;
    }

    @Override
    public void release(String requestNo) {
        if (requestNo != null && !requestNo.isBlank()) {
            entitlementService.releaseQuota(requestNo);
        }
    }
}
