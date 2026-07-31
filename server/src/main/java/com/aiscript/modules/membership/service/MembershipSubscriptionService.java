package com.aiscript.modules.membership.service;

import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.vo.MembershipChangeQuoteVO;
import com.aiscript.modules.payment.entity.AiPaymentOrder;

public interface MembershipSubscriptionService {
    MembershipChangeQuoteVO quote(Integer tenantId, Integer userId, Long skuId);

    AiUserSubscription fulfillPaidOrder(AiPaymentOrder order);

    AiUserSubscription scheduleDowngrade(Integer tenantId, Integer userId, Long skuId);

    AiUserSubscription revokeScheduledDowngrade(Integer tenantId, Integer userId);

    AiUserSubscription cancelAtPeriodEnd(Integer tenantId, Integer userId);

    void revokeByRefund(AiPaymentOrder order);
}