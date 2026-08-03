package com.aiscript.integration.pay;

public interface PayClient {
    String provider();
    PayCreateResponse createNativeOrder(PayCreateRequest request);
    PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message);
    PayQueryResponse queryOrder(String outTradeNo);
    void closeOrder(String outTradeNo);
    PayRefundResponse refund(PayRefundRequest request);
    default PayRefundResponse queryRefund(PayRefundRequest request) { throw new UnsupportedOperationException("不支持退款查询"); }
    default PayContractSignResponse createContractSign(PayContractSignRequest request) { throw new UnsupportedOperationException("不支持支付签约"); }
    default PayNotifyMessage verifyAndParseContractNotify(PayNotifyMessage message) { throw new UnsupportedOperationException("不支持签约回调"); }
    default PayCreateResponse createDeductOrder(PayCreateRequest request) { throw new UnsupportedOperationException("不支持周期扣款"); }
    default PayNotifyMessage verifyAndParseDeductNotify(PayNotifyMessage message) { return verifyAndParseNotify(message); }
    default void terminateContract(PayContractTerminateRequest request) { throw new UnsupportedOperationException("不支持解约"); }
    default PayContractQueryResponse queryContract(PayContractQueryRequest request) { throw new UnsupportedOperationException("不支持协议查询"); }
}
