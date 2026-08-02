package com.aiscript.integration.pay;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PayContractSignRequest {
    private String channel = "h5";
    private String appId;
    private String planId;
    private String outContractCode;
    private String contractDisplayAccount;
    private String contractNotifyUrl;
    private String openid;
    private String estimatedDeductDate;
    private BigDecimal estimatedDeductAmount;
}
