package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class MembershipBenefitVO {
    private String code;
    private String name;
    private String category;
    private String value;
    private String valueType;
    private String unit;
    private String resetType;
    private Boolean previewOnly;
    private Boolean enabled;
    private String description;
    private Integer displayOrder;
}