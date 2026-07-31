package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class MembershipEntitlementRow {
    private Long planId;
    private String planCode;
    private String benefitCode;
    private String benefitName;
    private String category;
    private String benefitValue;
    private String valueType;
    private String unit;
    private String resetType;
    private Boolean previewOnly;
    private Boolean definitionEnabled;
    private Boolean planEnabled;
}