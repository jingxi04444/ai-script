package com.aiscript.modules.tenant.entity;

import lombok.Data;

import com.aiscript.common.model.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.EqualsAndHashCode;

@TableName("sys_tenant")
@Data
@EqualsAndHashCode(callSuper = true)
public class SysTenant extends BaseEntity {
    private String tenantName;
    private String tenantCode;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String domain;
    private String logoUrl;
    private String themeKey;
    private Integer status;
    private String planCode;
    private Long storageQuotaBytes;
    private LocalDateTime startTime;
    private LocalDateTime expireTime;
}
