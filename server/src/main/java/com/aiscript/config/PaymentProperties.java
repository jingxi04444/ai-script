package com.aiscript.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "payment")
public class PaymentProperties {
    private boolean enabled = false;
    private boolean devMode = true;
    private String baseNotifyUrl;
    private String frontReturnUrl;
    private Wechat wechat = new Wechat();
    private Alipay alipay = new Alipay();

    @Data
    public static class Wechat {
        private boolean enabled = false;
        private String appId;
        private String mchId;
        private String apiV3Key;
        private String privateKeyPath;
        private String mchSerialNo;
        private String notifyUrl;
        private AutoDeduct autoDeduct = new AutoDeduct();
        @Data
        public static class AutoDeduct {
            private boolean enabled = false;
            private String planId;
            private String contractNotifyUrl;
            private String deductNotifyUrl;
        }
    }

    @Data
    public static class Alipay {
        private boolean enabled = false;
        private String appId;
        private String merchantPrivateKey;
        private String alipayPublicKey;
        private String notifyUrl;
        private String serverUrl = "https://openapi.alipay.com/gateway.do";
        private String signType = "RSA2";
        private String sellerId;
        private AutoDeduct autoDeduct = new AutoDeduct();

        @Data
        public static class AutoDeduct {
            private boolean enabled = false;
            private String productCode = "GENERAL_WITHHOLDING";
            private String signScene;
            private String contractNotifyUrl;
            private String deductNotifyUrl;
        }
    }
}
