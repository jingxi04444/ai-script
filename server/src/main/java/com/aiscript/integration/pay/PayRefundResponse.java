package com.aiscript.integration.pay;

import lombok.Data;

@Data
public class PayRefundResponse {
    private String refundNo;
    private String providerRefundNo;
    private String status;
    private boolean success;
    private String rawPayload;
}