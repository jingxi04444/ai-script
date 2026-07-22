package com.aiscript.modules.payment.vo;

import java.math.BigDecimal;

public class WalletTransactionVO {
    public String id;
    public String walletId;
    public String userId;
    public String transactionType;
    public BigDecimal amount;
    public BigDecimal balanceAfter;
    public String bizType;
    public String bizId;
    public String remark;
    public String createdAt;
}
