package com.aiscript.modules.membership.vo;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class MembershipChangeQuoteVO {
    private String changeType;
    private String effectiveType;
    private String subscriptionId;
    private String currentPlanId;
    private String currentSkuId;
    private String targetPlanId;
    private String targetSkuId;
    private BigDecimal originalAmount;
    private BigDecimal creditAmount;
    private BigDecimal payableAmount;
    private String effectiveTime;
}