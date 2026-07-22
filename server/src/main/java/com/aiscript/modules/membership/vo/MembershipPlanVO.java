package com.aiscript.modules.membership.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MembershipPlanVO {
    private String id;
    private String code;
    private String name;
    private BigDecimal price;
    private Integer periodDays;
}
