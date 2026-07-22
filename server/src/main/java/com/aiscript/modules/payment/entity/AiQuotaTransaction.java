package com.aiscript.modules.payment.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_quota_transaction")
@Data
public class AiQuotaTransaction {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer quotaAccountId;
    private Integer userId;
    private Integer changeCount;
    private Integer remainingAfter;
    private String bizType;
    private Integer bizId;
    private String remark;
    private LocalDateTime createTime;
}
