package com.aiscript.integration.pay;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import lombok.Data;

@Data
public class PayNotifyMessage {
    private String provider;
    private String orderNo;
    private String providerTradeNo;
    private String tradeStatus;
    private BigDecimal totalAmount;
    private boolean verified;
    private boolean paid;
    private String notifyId;
    private String appId;
    private String mchId;
    private String sellerId;
    private String rawBody;
    private String signature;
    private String errorMsg;
    private Map<String, String> headers = new HashMap<>();
    private Map<String, String> params = new HashMap<>();
}
