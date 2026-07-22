package com.aiscript.modules.payment.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("ai_wallet_account")
@Data
public class AiWalletAccount {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer userId;
    private BigDecimal balance;
    private BigDecimal frozenBalance;
    private Integer version;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
