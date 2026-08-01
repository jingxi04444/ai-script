package com.aiscript.modules.auth.vo;

import lombok.Data;

@Data
public class WechatLoginStatusVO {
    private String status;
    private LoginVO login;
}
