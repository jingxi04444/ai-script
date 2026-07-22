package com.aiscript.modules.auth.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class UserInfoVO {
    private String id;
    private String username;
    private String email;
    private String phone;
    private String avatar;
    private Integer memberLevel;
    private BigDecimal balance;
    private String role;
    private List<String> roles;
    private List<String> permissions;
    private List<MenuVO> menus;
}
