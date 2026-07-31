package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class UserMembershipVO {
    private String id;
    private String userId;
    private String planId;
    private String skuId;
    private String planCode;
    private String planName;
    private String status;
    private Boolean autoRenew;
    private Boolean cancelAtPeriodEnd;
    private String startTime;
    private String currentPeriodStart;
    private String currentPeriodEnd;
    private String expireTime;
    private String benefitCycleStart;
    private String benefitCycleEnd;
    private String pendingPlanId;
    private String pendingSkuId;
    private String pendingEffectiveTime;
}