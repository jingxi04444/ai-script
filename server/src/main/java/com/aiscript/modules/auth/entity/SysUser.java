package com.aiscript.modules.auth.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.EqualsAndHashCode;

@TableName("sys_user")
@Data
@EqualsAndHashCode(callSuper = true)
public class SysUser extends TenantBaseEntity {
    private String username;
    private String account;
    private String passwordHash;
    private String phone;
    private String email;
    private String wechatOpenId;
    private String wechatUnionId;
    private String avatarUrl;
    private String userType;
    private Integer memberLevel;
    private BigDecimal balance;
    private Integer status;
}
