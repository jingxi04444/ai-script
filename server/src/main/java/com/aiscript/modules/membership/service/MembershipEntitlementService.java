package com.aiscript.modules.membership.service;

import com.aiscript.modules.membership.vo.QuotaReservationVO;

public interface MembershipEntitlementService {
    String getValue(Integer tenantId, Integer userId, String benefitCode);

    boolean hasFeature(Integer tenantId, Integer userId, String benefitCode);

    long getLimit(Integer tenantId, Integer userId, String benefitCode);

    long getPointCost(Integer tenantId, Integer userId, String operationCode);

    void clearEntitlementCache(Integer tenantId, Integer userId);

    void requireFeature(Integer tenantId, Integer userId, String benefitCode);

    QuotaReservationVO reserveQuota(
        Integer tenantId,
        Integer userId,
        String benefitCode,
        long amount,
        String requestNo,
        String bizType,
        Long bizId
    );

    QuotaReservationVO confirmQuota(String requestNo);

    QuotaReservationVO releaseQuota(String requestNo);

    QuotaReservationVO releaseConsumedQuota(String requestNo);
}
