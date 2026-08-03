package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class TemplateCustomRequestVO {
    private String id;
    private String userId;
    private String planId;
    private String title;
    private String requirements;
    private String contact;
    private String status;
    private String adminRemark;
    private String handledBy;
    private String handledTime;
    private String createdAt;
    private String updatedAt;
}
