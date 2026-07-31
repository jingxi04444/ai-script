package com.aiscript.modules.membership.vo;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class MembershipPlanVO {
    private String id;
    private String code;
    private String name;
    private Integer level;
    private Boolean free;
    private String description;
    private Integer displayOrder;

    /** 兼容旧版购买弹窗，后续下单统一使用 skuId。 */
    private BigDecimal price;
    private Integer periodDays;

    private List<MembershipPlanSkuVO> skus = new ArrayList<>();
    private List<MembershipBenefitVO> benefits = new ArrayList<>();
}