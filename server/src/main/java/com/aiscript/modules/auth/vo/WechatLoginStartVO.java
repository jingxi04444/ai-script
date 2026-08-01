package com.aiscript.modules.auth.vo;

import lombok.Data;

@Data
public class WechatLoginStartVO {
    private String state;
    private String authorizationUrl;
    private Integer expiresIn;
}
