package com.aiscript.modules.auth.vo;

import lombok.Data;

import java.util.List;

@Data
public class AdminUserVO {
    private String id;
    private String username;
    private String role;
    private List<String> roles;
    private List<String> permissions;
    private List<MenuVO> menus;
}
