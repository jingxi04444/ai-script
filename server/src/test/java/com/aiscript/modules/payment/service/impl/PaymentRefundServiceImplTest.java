package com.aiscript.modules.payment.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.aiscript.integration.pay.PayClient;
import com.aiscript.integration.pay.PayClientRouter;
import com.aiscript.integration.pay.PayCreateRequest;
import com.aiscript.integration.pay.PayCreateResponse;
import com.aiscript.integration.pay.PayNotifyMessage;
import com.aiscript.integration.pay.PayQueryResponse;
import com.aiscript.integration.pay.PayRefundRequest;
import com.aiscript.integration.pay.PayRefundResponse;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.service.MembershipSubscriptionService;
import com.aiscript.modules.payment.entity.AiPaymentOrder;
import com.aiscript.modules.payment.entity.AiRefundOrder;
import com.aiscript.modules.payment.mapper.AiPaymentOrderMapper;
import com.aiscript.modules.payment.mapper.AiRefundOrderMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;

class PaymentRefundServiceImplTest {
    private AiRefundOrderMapper refundMapper;
    private AiPaymentOrderMapper paymentOrderMapper;
    private AiMembershipPlanSkuMapper skuMapper;
    private TrackingPayClient payClient;
    private PaymentRefundServiceImpl service;
    private AiRefundOrder refund;

    @BeforeEach
    void setUp() {
        refundMapper = mock(AiRefundOrderMapper.class);
        paymentOrderMapper = mock(AiPaymentOrderMapper.class);
        skuMapper = mock(AiMembershipPlanSkuMapper.class);
        payClient = new TrackingPayClient();
        PayClientRouter payClientRouter = new PayClientRouter(List.of(payClient));
        service = new PaymentRefundServiceImpl(
            refundMapper,
            paymentOrderMapper,
            skuMapper,
            payClientRouter,
            mock(MembershipSubscriptionService.class),
            unusedTransactionManager()
        );

        refund = new AiRefundOrder();
        refund.setId(10L);
        refund.setRefundNo("REFUND_1001");
        refund.setPaymentOrderId(20L);
        refund.setUserId(30L);
        refund.setRefundAmount(new BigDecimal("39.00"));
        refund.setRefundReason("测试退款");

        AiPaymentOrder order = new AiPaymentOrder();
        order.setId(20);
        order.setOrderNo("ORDER_1001");
        order.setProvider("alipay");
        order.setPayMethod("alipay_scan");
        order.setAmount(new BigDecimal("39.00"));

        when(refundMapper.selectOne(any())).thenReturn(refund);
        when(paymentOrderMapper.selectById(20L)).thenReturn(order);
    }

    @Test
    void refreshProcessingRefundQueriesProviderInsteadOfSubmittingAgain() {
        refund.setStatus("processing");
        payClient.queryResponse = pendingResponse();

        service.refresh(refund.getRefundNo());

        assertEquals(1, payClient.queryCount);
        assertEquals(0, payClient.refundCount);
    }

    @Test
    void refreshFailedRefundRetriesWithSameRefundNumber() {
        refund.setStatus("failed");
        payClient.refundResponse = pendingResponse();

        service.refresh(refund.getRefundNo());

        assertEquals(1, payClient.refundCount);
        assertEquals(0, payClient.queryCount);
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 7, 15})
    void requestRefundAcceptsPaidOrderInsideEachConfiguredWindow(int refundDays) {
        AiPaymentOrder order = refundableOrder(LocalDateTime.now().minusDays(refundDays).plusMinutes(1));
        AiMembershipPlanSku sku = new AiMembershipPlanSku();
        sku.setRefundDays(refundDays);
        when(paymentOrderMapper.selectOne(any())).thenReturn(order);
        when(refundMapper.selectOne(any())).thenReturn(null);
        when(skuMapper.selectById(99L)).thenReturn(sku);

        service.requestRefund(1, 30, order.getOrderNo(), "不再需要");

        verify(refundMapper).insert(any(AiRefundOrder.class));
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 7, 15})
    void requestRefundRejectsPaidOrderAfterEachConfiguredWindow(int refundDays) {
        AiPaymentOrder order = refundableOrder(LocalDateTime.now().minusDays(refundDays).minusMinutes(1));
        AiMembershipPlanSku sku = new AiMembershipPlanSku();
        sku.setRefundDays(refundDays);
        when(paymentOrderMapper.selectOne(any())).thenReturn(order);
        when(skuMapper.selectById(99L)).thenReturn(sku);

        BusinessException exception = assertThrows(BusinessException.class,
            () -> service.requestRefund(1, 30, order.getOrderNo(), "超过期限"));

        assertEquals("已超过该套餐的退款申请期限", exception.getMessage());
    }

    private AiPaymentOrder refundableOrder(LocalDateTime payTime) {
        AiPaymentOrder order = new AiPaymentOrder();
        order.setId(20);
        order.setUserId(30);
        order.setOrderNo("ORDER_REFUND_WINDOW");
        order.setOrderType("member");
        order.setStatus("paid");
        order.setFulfillStatus("success");
        order.setSkuId(99L);
        order.setPayTime(payTime);
        order.setAmount(new BigDecimal("39.00"));
        order.setPaidAmount(new BigDecimal("39.00"));
        order.setRefundAmount(BigDecimal.ZERO);
        order.setProvider("alipay");
        return order;
    }

    private PayRefundResponse pendingResponse() {
        PayRefundResponse response = new PayRefundResponse();
        response.setRefundNo(refund.getRefundNo());
        response.setStatus("REFUND_PROCESSING");
        response.setSuccess(false);
        return response;
    }

    private PlatformTransactionManager unusedTransactionManager() {
        return new PlatformTransactionManager() {
            @Override
            public TransactionStatus getTransaction(TransactionDefinition definition) {
                throw new UnsupportedOperationException("测试不应开启事务");
            }

            @Override
            public void commit(TransactionStatus status) {
                throw new UnsupportedOperationException("测试不应提交事务");
            }

            @Override
            public void rollback(TransactionStatus status) {
                throw new UnsupportedOperationException("测试不应回滚事务");
            }
        };
    }

    private static class TrackingPayClient implements PayClient {
        private int refundCount;
        private int queryCount;
        private PayRefundResponse refundResponse;
        private PayRefundResponse queryResponse;

        @Override public String provider() { return "alipay"; }
        @Override public PayCreateResponse createNativeOrder(PayCreateRequest request) { throw new UnsupportedOperationException(); }
        @Override public PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message) { throw new UnsupportedOperationException(); }
        @Override public PayQueryResponse queryOrder(String outTradeNo) { throw new UnsupportedOperationException(); }
        @Override public void closeOrder(String outTradeNo) { throw new UnsupportedOperationException(); }

        @Override
        public PayRefundResponse refund(PayRefundRequest request) {
            refundCount++;
            return refundResponse;
        }

        @Override
        public PayRefundResponse queryRefund(PayRefundRequest request) {
            queryCount++;
            return queryResponse;
        }
    }
}
