package com.aiscript.modules.membership.vo;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class MembershipPlanCatalogRow {
    private Long id;
    private String code;
    private String name;
    private Integer level;
    private Boolean free;
    private String description;
    private Integer displayOrder;
    private Integer status;
    private BigDecimal price;
    private Integer periodDays;
    private String skusJson;
    private String benefitsJson;
}
