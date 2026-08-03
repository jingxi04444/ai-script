package com.aiscript.modules.payment.dto;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PaymentOrderDTO {
    private String planId;
    private String skuId;
    private String pointPackageId;
    private String payMethod;
    private BigDecimal amount;
    private String idempotencyKey;
    /**
     * @deprecated 自动续费由后端根据会员 SKU billingMode=auto_renew 判断，前端传值不再生效。
     */
    @Deprecated
    private Boolean autoRenew;
    private String openid;
    private String contractChannel;
}
