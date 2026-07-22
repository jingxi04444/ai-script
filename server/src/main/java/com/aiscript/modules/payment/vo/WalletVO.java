package com.aiscript.modules.payment.vo;

import java.math.BigDecimal;

public class WalletVO {
    public String id;
    public String userId;
    public BigDecimal balance;
    public BigDecimal frozenBalance;
    public String updatedAt;
}
