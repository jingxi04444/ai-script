package com.aiscript.modules.user.vo;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UserVO {
    private String id;
    private String username;
    private String email;
    private String phone;
    private Integer memberLevel;
    private BigDecimal balance;
    private String status;
    private String createdAt;
}
