package com.aiscript.modules.payment.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.payment.dto.PaymentCallbackDTO;
import com.aiscript.modules.payment.dto.PaymentOrderDTO;
import com.aiscript.modules.payment.dto.PaymentOrderQueryDTO;
import com.aiscript.modules.payment.dto.QuotaAdjustDTO;
import com.aiscript.integration.pay.PayNotifyMessage;
import com.aiscript.modules.payment.vo.QuotaVO;
import com.aiscript.modules.payment.vo.PaymentOrderVO;
import com.aiscript.modules.payment.vo.WalletTransactionVO;
import com.aiscript.modules.payment.vo.WalletVO;
import java.util.List;

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
    PaymentOrderVO handleBalanceMemberOrder(PaymentOrderDTO dto);

    WalletVO wallet();

    PageResult<WalletTransactionVO> walletTransactions(com.aiscript.common.pagination.PageQuery query);

    List<QuotaVO> quotas();

    QuotaVO adjustQuota(QuotaAdjustDTO dto);
}
