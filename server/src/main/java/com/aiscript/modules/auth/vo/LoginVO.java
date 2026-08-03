package com.aiscript.modules.auth.vo;

import lombok.Data;

@Data
public class LoginVO {
    private String token;
    private UserInfoVO user;
    private Boolean needsPhoneBinding;
    private Boolean needsEmailBinding;
}
