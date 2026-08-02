package com.aiscript.integration.pay;

import lombok.Data;

@Data
public class PayContractQueryRequest {
    private String planId;
    private String outContractCode;
    private String contractId;
}
