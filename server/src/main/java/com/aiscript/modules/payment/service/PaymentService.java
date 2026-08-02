package com.aiscript.modules.payment.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.payment.dto.PaymentCallbackDTO;
import com.aiscript.modules.payment.dto.PaymentOrderDTO;
import com.aiscript.modules.payment.dto.PaymentOrderQueryDTO;
import com.aiscript.modules.payment.dto.QuotaAdjustDTO;
import com.aiscript.integration.pay.PayNotifyMessage;
import com.aiscript.modules.payment.vo.QuotaVO;
import com.aiscript.modules.payment.vo.PaymentOrderVO;
import java.util.List;
import java.time.LocalDateTime;

public interface PaymentService {
    PaymentOrderVO recharge(PaymentOrderDTO dto);

    PaymentOrderVO memberOrder(PaymentOrderDTO dto);

    PaymentOrderVO pointOrder(PaymentOrderDTO dto);

    PaymentOrderVO handleCallback(PaymentCallbackDTO dto);
    PaymentOrderVO getOrder(String orderNo);
    PageResult<PaymentOrderVO> orders(PaymentOrderQueryDTO query);
    PaymentOrderVO closeOrder(String orderNo);
    PaymentOrderVO queryProviderOrder(String orderNo);
    PageResult<PaymentOrderVO> adminOrders(PaymentOrderQueryDTO query);
    PaymentOrderVO adminGetOrder(String orderNo);
    PaymentOrderVO adminQueryProviderOrder(String orderNo);
    PaymentOrderVO handleProviderNotify(PayNotifyMessage msg);

    PaymentOrderVO renewMembershipSubscription(
        Integer tenantId,
        Integer userId,
        Long subscriptionId,
        Long skuId,
        LocalDateTime renewalDueTime,
        String idempotencyKey
    );

    void handleContractNotify(PayNotifyMessage msg);

    void cancelWechatAutoRenew();

    List<QuotaVO> quotas();

    QuotaVO adjustQuota(QuotaAdjustDTO dto);
}
