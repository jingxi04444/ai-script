package com.aiscript.modules.membership.service;

import com.aiscript.modules.membership.entity.AiMembershipBenefitCycle;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import java.util.List;

public interface MembershipService {
    List<MembershipPlanVO> plans();

    List<MembershipPlanVO> adminPlans();

    UserMembershipVO currentMembership();

    void ensureFreeSubscription(Integer tenantId, Integer userId);

    AiUserSubscription ensureActiveSubscription(Integer tenantId, Integer userId);

    AiMembershipBenefitCycle ensureCurrentBenefitCycle(AiUserSubscription subscription);

    int processDueSubscriptionLifecycle();
}
