package com.aiscript.integration.pay;

import lombok.Data;

@Data
public class PayContractTerminateRequest {
    private String planId;
    private String outContractCode;
    private String contractId;
    private String reason;
}
