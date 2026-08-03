package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wechat.pay.java.core.RSAAutoCertificateConfig;
import com.wechat.pay.java.core.notification.NotificationParser;
import com.wechat.pay.java.core.notification.RequestParam;
import com.wechat.pay.java.service.payments.model.Transaction;
import com.wechat.pay.java.service.payments.nativepay.NativePayService;
import com.wechat.pay.java.service.payments.nativepay.model.Amount;
import com.wechat.pay.java.service.payments.nativepay.model.CloseOrderRequest;
import com.wechat.pay.java.service.payments.nativepay.model.PrepayRequest;
import com.wechat.pay.java.service.payments.nativepay.model.PrepayResponse;
import com.wechat.pay.java.service.payments.nativepay.model.QueryOrderByOutTradeNoRequest;
import com.wechat.pay.java.service.refund.RefundService;
import com.wechat.pay.java.service.refund.model.AmountReq;
import com.wechat.pay.java.service.refund.model.CreateRequest;
import com.wechat.pay.java.service.refund.model.Refund;
import com.wechat.pay.java.service.refund.model.Status;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class WechatNativePayClient implements PayClient {
    private final PaymentProperties properties;
    private final ObjectMapper objectMapper;
    public WechatNativePayClient(PaymentProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }
    public String provider() { return "wechat"; }
    public PayCreateResponse createNativeOrder(PayCreateRequest request) {
        ensureEnabled();
        PrepayRequest req = new PrepayRequest();
        req.setAppid(properties.getWechat().getAppId()); req.setMchid(properties.getWechat().getMchId());
        req.setOutTradeNo(request.getOrderNo()); req.setDescription(request.getSubject()); req.setNotifyUrl(notifyUrl(request));
        if (request.getExpireTime() != null) {
            req.setTimeExpire(request.getExpireTime().atOffset(ZoneOffset.ofHours(8)).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        }
        Amount amount = new Amount(); amount.setCurrency("CNY"); amount.setTotal(toFen(request.getAmount())); req.setAmount(amount);
        PrepayResponse resp = service().prepay(req);
        PayCreateResponse r = new PayCreateResponse(); r.setProvider(provider()); r.setOrderNo(request.getOrderNo()); r.setAmount(request.getAmount());
        r.setSubject(request.getSubject()); r.setQrContent(resp.getCodeUrl()); r.setPayUrl(resp.getCodeUrl()); r.setRawPayload(resp.toString()); return r;
    }
    public PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message) {
        ensureEnabled();
        try {
            RequestParam p = new RequestParam.Builder().serialNumber(header(message, "Wechatpay-Serial")).nonce(header(message, "Wechatpay-Nonce"))
                .signature(header(message, "Wechatpay-Signature")).timestamp(header(message, "Wechatpay-Timestamp")).body(message.getRawBody()).build();
            Transaction tx = new NotificationParser(config()).parse(p, Transaction.class);
            fill(message, tx); fillNotifyId(message); message.setVerified(true);
            if (!properties.getWechat().getAppId().equals(message.getAppId()) || !properties.getWechat().getMchId().equals(message.getMchId())) {
                message.setVerified(false); message.setErrorMsg("微信支付商户身份不匹配"); throw new BusinessException("微信支付商户身份不匹配");
            }
            return message;
        } catch (Exception ex) { message.setVerified(false); message.setErrorMsg(ex.getMessage()); throw new BusinessException("微信支付回调验签失败"); }
    }
    public PayQueryResponse queryOrder(String outTradeNo) {
        ensureEnabled(); QueryOrderByOutTradeNoRequest req = new QueryOrderByOutTradeNoRequest(); req.setMchid(properties.getWechat().getMchId()); req.setOutTradeNo(outTradeNo);
        Transaction tx = service().queryOrderByOutTradeNo(req); PayNotifyMessage m = new PayNotifyMessage(); fill(m, tx);
        PayQueryResponse r = new PayQueryResponse(); r.setProvider(provider()); r.setOrderNo(m.getOrderNo()); r.setProviderTradeNo(m.getProviderTradeNo()); r.setTradeStatus(m.getTradeStatus()); r.setPaidAmount(m.getTotalAmount()); r.setPaid(m.isPaid()); return r;
    }
    public void closeOrder(String outTradeNo) { ensureEnabled(); CloseOrderRequest req = new CloseOrderRequest(); req.setMchid(properties.getWechat().getMchId()); req.setOutTradeNo(outTradeNo); service().closeOrder(req); }
    public PayRefundResponse refund(PayRefundRequest request) {
        ensureEnabled();
        CreateRequest createRequest = new CreateRequest();
        createRequest.setOutTradeNo(request.getOrderNo());
        createRequest.setOutRefundNo(request.getRefundNo());
        createRequest.setReason(request.getReason());
        AmountReq amount = new AmountReq();
        amount.setRefund(toFen(request.getRefundAmount()).longValue());
        amount.setTotal(toFen(request.getTotalAmount()).longValue());
        amount.setCurrency("CNY");
        createRequest.setAmount(amount);
        Refund result = refundService().create(createRequest);
        PayRefundResponse response = new PayRefundResponse();
        response.setRefundNo(request.getRefundNo());
        response.setProviderRefundNo(result.getRefundId());
        response.setStatus(result.getStatus() == null ? null : result.getStatus().name());
        response.setSuccess(result.getStatus() == Status.SUCCESS);
        response.setRawPayload(result.toString());
        return response;
    }    private void ensureEnabled() {
        if (!properties.isEnabled() || !properties.getWechat().isEnabled() || !StringUtils.hasText(properties.getWechat().getAppId()) || !StringUtils.hasText(properties.getWechat().getMchId()) || !StringUtils.hasText(properties.getWechat().getApiV3Key()) || !StringUtils.hasText(properties.getWechat().getPrivateKeyPath()) || !StringUtils.hasText(properties.getWechat().getMchSerialNo()) || !StringUtils.hasText(properties.getWechat().getNotifyUrl())) {
            throw new BusinessException("微信支付未启用或配置不完整");
        }
    }
    private RSAAutoCertificateConfig config() { return new RSAAutoCertificateConfig.Builder().merchantId(properties.getWechat().getMchId()).privateKeyFromPath(properties.getWechat().getPrivateKeyPath()).merchantSerialNumber(properties.getWechat().getMchSerialNo()).apiV3Key(properties.getWechat().getApiV3Key()).build(); }
    private NativePayService service() { return new NativePayService.Builder().config(config()).build(); }
    private RefundService refundService() { return new RefundService.Builder().config(config()).build(); }
    private String notifyUrl(PayCreateRequest req) { return StringUtils.hasText(properties.getWechat().getNotifyUrl()) ? properties.getWechat().getNotifyUrl() : req.getNotifyUrl(); }
    private Integer toFen(BigDecimal amount) { return amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValueExact(); }
    private BigDecimal yuan(Integer fen) { return fen == null ? null : BigDecimal.valueOf(fen).divide(BigDecimal.valueOf(100), 2, RoundingMode.UNNECESSARY); }
    private String header(PayNotifyMessage m, String name) { return m.getHeaders().getOrDefault(name, m.getHeaders().get(name.toLowerCase())); }
    private void fill(PayNotifyMessage m, Transaction tx) { m.setProvider(provider()); m.setAppId(tx.getAppid()); m.setMchId(tx.getMchid()); m.setOrderNo(tx.getOutTradeNo()); m.setProviderTradeNo(tx.getTransactionId()); m.setTradeStatus(tx.getTradeState() == null ? null : tx.getTradeState().name()); m.setPaid(tx.getTradeState() == Transaction.TradeStateEnum.SUCCESS); if (tx.getAmount() != null) m.setTotalAmount(yuan(tx.getAmount().getTotal())); }
    private void fillNotifyId(PayNotifyMessage message) {
        try {
            message.setNotifyId(objectMapper.readTree(message.getRawBody()).path("id").asText(null));
        } catch (Exception ignored) {
            // 验签仍以微信 SDK 结果为准；通知ID仅用于本地幂等。
        }
    }
}
