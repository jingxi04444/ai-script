package com.aiscript.modules.payment.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("ai_wallet_transaction")
@Data
public class AiWalletTransaction {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer walletId;
    private Integer userId;
    private String transactionType;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String bizType;
    private Integer bizId;
    private String orderNo;
    private String requestNo;
    private String remark;
    private LocalDateTime createTime;
}
