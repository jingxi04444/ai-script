package com.aiscript.integration.pay;

public interface PayClient {
    String provider();
    PayCreateResponse createNativeOrder(PayCreateRequest request);
    PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message);
    PayQueryResponse queryOrder(String outTradeNo);
    void closeOrder(String outTradeNo);
}
