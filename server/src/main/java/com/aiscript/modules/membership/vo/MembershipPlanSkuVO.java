package com.aiscript.modules.membership.vo;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class MembershipPlanSkuVO {
    private String id;
    private String code;
    private String name;
    private String billingMode;
    private String periodUnit;
    private Integer periodCount;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Integer refundDays;
    private Integer displayOrder;
}