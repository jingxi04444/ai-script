package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@ConditionalOnProperty(prefix = "payment", name = "dev-mode", havingValue = "true")
public class LocalPayClient implements PayClient {
    private final PaymentProperties properties;
    public LocalPayClient(PaymentProperties properties) { this.properties = properties; }
    public String provider() { return "local"; }
    public PayCreateResponse createNativeOrder(PayCreateRequest request) {
        if (properties.isEnabled() && !properties.isDevMode()) throw new BusinessException("生产环境禁止使用本地模拟支付");
        PayCreateResponse r = new PayCreateResponse();
        r.setProvider(provider()); r.setOrderNo(request.getOrderNo()); r.setAmount(request.getAmount());
        r.setProviderTradeNo("LOCAL_" + request.getOrderNo()); r.setQrContent("localpay://qr/" + request.getOrderNo()); r.setPayUrl(r.getQrContent());
        return r;
    }
    public PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message) { message.setVerified(properties.isDevMode()); return message; }
    public PayQueryResponse queryOrder(String outTradeNo) { PayQueryResponse r = new PayQueryResponse(); r.setProvider(provider()); r.setOrderNo(outTradeNo); r.setTradeStatus("UNKNOWN"); return r; }
    public void closeOrder(String outTradeNo) { }
}
