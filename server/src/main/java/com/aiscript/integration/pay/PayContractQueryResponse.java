package com.aiscript.integration.pay;

import lombok.Data;

@Data
public class PayContractQueryResponse {
    private String provider;
    private String outContractCode;
    private String contractId;
    private String status;
    private String rawPayload;
}
