package com.aiscript.modules.payment.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_quota_account")
@Data
public class AiQuotaAccount {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer userId;
    private String quotaType;
    private Integer remainingCount;
    private LocalDateTime expireTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
