package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class AdminSubscriptionVO {
    private String id;
    private String userId;
    private String username;
    private String account;
    private String planId;
    private String planName;
    private String skuId;
    private String skuName;
    private String status;
    private Boolean autoRenew;
    private Boolean cancelAtPeriodEnd;
    private String currentPeriodStart;
    private String currentPeriodEnd;
    private String pendingPlanName;
    private String createTime;
}
