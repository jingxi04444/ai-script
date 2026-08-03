package com.aiscript.modules.user.vo;

import lombok.Data;

@Data
public class UserVO {
    private String id;
    private String username;
    private String account;
    private String email;
    private String phone;
    private Integer memberLevel;
    private Boolean internalAccount;
    private String planId;
    private String planName;
    private String skuId;
    private String skuName;
    private String subscriptionStatus;
    private String subscriptionEnd;
    private String status;
    private String createdAt;
}
