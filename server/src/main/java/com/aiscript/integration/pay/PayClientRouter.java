package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class PayClientRouter {
    private final List<PayClient> clients;
    public PayClientRouter(List<PayClient> clients) { this.clients = clients; }
    public PayClient route(String provider, String payMethod) {
        String key = StringUtils.hasText(provider) ? provider : providerOf(payMethod);
        return clients.stream().filter(c -> c.provider().equalsIgnoreCase(key)).findFirst()
            .orElseThrow(() -> new BusinessException("支付渠道未配置: " + key));
    }
    public String providerOf(String payMethod) {
        if ("alipay".equalsIgnoreCase(payMethod) || "alipay_scan".equalsIgnoreCase(payMethod)) return "alipay";
        if ("alipay_auto_deduct".equalsIgnoreCase(payMethod)) return "alipay_auto_deduct";
        if ("wechat".equalsIgnoreCase(payMethod) || "wechat_native".equalsIgnoreCase(payMethod)) return "wechat";
        if ("wechat_auto_deduct".equalsIgnoreCase(payMethod)) return "wechat_auto_deduct";
        throw new BusinessException("不支持的支付方式: " + payMethod);
    }
}
