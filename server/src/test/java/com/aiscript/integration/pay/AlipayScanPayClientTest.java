package com.aiscript.integration.pay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import com.alipay.easysdk.payment.common.models.AlipayTradeFastpayRefundQueryResponse;
import com.alipay.easysdk.payment.common.models.AlipayTradeRefundResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AlipayScanPayClientTest {
    private AlipayScanPayClient client;
    private PayRefundRequest request;

    @BeforeEach
    void setUp() {
        client = new AlipayScanPayClient(new PaymentProperties());
        request = new PayRefundRequest();
        request.setOrderNo("ORDER_1001");
        request.setRefundNo("REFUND_1001");
        request.setRefundAmount(new BigDecimal("39.00"));
    }

    @Test
    void marksRefundCompletedOnlyWhenFundsChanged() {
        AlipayTradeRefundResponse result = new AlipayTradeRefundResponse();
        result.code = "10000";
        result.fundChange = "Y";
        result.tradeNo = "ALI_TRADE_1";
        result.refundSettlementId = "ALI_REFUND_1";
        result.httpBody = "{}";

        PayRefundResponse response = client.mapRefundResponse(request, result);

        assertTrue(response.isSuccess());
        assertEquals("REFUND_SUCCESS", response.getStatus());
        assertEquals("ALI_REFUND_1", response.getProviderRefundNo());
    }

    @Test
    void keepsRefundProcessingWhenRequestSucceededWithoutFundChange() {
        AlipayTradeRefundResponse result = new AlipayTradeRefundResponse();
        result.code = "10000";
        result.fundChange = "N";
        result.tradeNo = "ALI_TRADE_1";

        PayRefundResponse response = client.mapRefundResponse(request, result);

        assertFalse(response.isSuccess());
        assertEquals("REFUND_PROCESSING", response.getStatus());
    }

    @Test
    void confirmsRefundWithOfficialRefundQueryStatus() {
        AlipayTradeFastpayRefundQueryResponse result = new AlipayTradeFastpayRefundQueryResponse();
        result.code = "10000";
        result.refundStatus = "REFUND_SUCCESS";
        result.tradeNo = "ALI_TRADE_1";
        result.refundSettlementId = "ALI_REFUND_1";

        PayRefundResponse response = client.mapRefundQueryResponse(request, result);

        assertTrue(response.isSuccess());
        assertEquals("REFUND_SUCCESS", response.getStatus());
        assertEquals("ALI_REFUND_1", response.getProviderRefundNo());
    }

    @Test
    void keepsUnknownProviderResultPendingForLaterQuery() {
        AlipayTradeRefundResponse result = new AlipayTradeRefundResponse();
        result.code = "20000";
        result.subCode = "isp.unknow-error";
        result.subMsg = "服务暂时不可用";

        PayRefundResponse response = client.mapRefundResponse(request, result);

        assertFalse(response.isSuccess());
        assertEquals("REFUND_UNKNOWN", response.getStatus());
    }

    @Test
    void rejectsDefiniteProviderFailure() {
        AlipayTradeRefundResponse result = new AlipayTradeRefundResponse();
        result.code = "40004";
        result.subCode = "ACQ.SELLER_BALANCE_NOT_ENOUGH";
        result.subMsg = "卖家余额不足";

        BusinessException exception = assertThrows(
            BusinessException.class,
            () -> client.mapRefundResponse(request, result)
        );

        assertTrue(exception.getMessage().contains("卖家余额不足"));
    }
}
