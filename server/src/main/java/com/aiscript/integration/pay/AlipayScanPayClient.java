package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import com.alipay.easysdk.factory.Factory;
import com.alipay.easysdk.kernel.Config;
import com.alipay.easysdk.payment.common.models.AlipayTradeQueryResponse;
import com.alipay.easysdk.payment.facetoface.models.AlipayTradePrecreateResponse;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AlipayScanPayClient implements PayClient {
    private final PaymentProperties properties;
    public AlipayScanPayClient(PaymentProperties properties) { this.properties = properties; }
    public String provider() { return "alipay"; }
    public PayCreateResponse createNativeOrder(PayCreateRequest request) {
        ensureEnabled();
        try { init(); AlipayTradePrecreateResponse resp = Factory.Payment.FaceToFace().asyncNotify(notifyUrl(request)).preCreate(request.getSubject(), request.getOrderNo(), request.getAmount().toPlainString());
            if (!"10000".equals(resp.code)) throw new BusinessException("支付宝下单失败: " + resp.subMsg);
            PayCreateResponse r = new PayCreateResponse(); r.setProvider(provider()); r.setOrderNo(request.getOrderNo()); r.setAmount(request.getAmount()); r.setSubject(request.getSubject()); r.setQrContent(resp.qrCode); r.setPayUrl(resp.qrCode); r.setRawPayload(resp.httpBody); return r;
        } catch (BusinessException ex) { throw ex; } catch (Exception ex) { throw new BusinessException("支付宝下单失败"); }
    }
    public PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message) {
        ensureEnabled(); initQuietly(); boolean ok;
        try { ok = Boolean.TRUE.equals(Factory.Payment.Common().verifyNotify(message.getParams())); } catch (Exception ex) { message.setErrorMsg(ex.getMessage()); throw new BusinessException("支付宝回调验签失败"); }
        message.setProvider(provider()); message.setVerified(ok); if (!ok) { message.setErrorMsg("支付宝回调验签失败"); throw new BusinessException("支付宝回调验签失败"); }
        message.setNotifyId(message.getParams().get("notify_id")); message.setAppId(message.getParams().get("app_id")); message.setSellerId(message.getParams().get("seller_id"));
        if (!StringUtils.hasText(message.getAppId()) || !StringUtils.hasText(message.getSellerId()) || !StringUtils.hasText(message.getParams().get("total_amount"))) { message.setVerified(false); message.setErrorMsg("支付宝回调关键字段缺失"); throw new BusinessException("支付宝回调关键字段缺失"); }
        if (!properties.getAlipay().getAppId().equals(message.getAppId())) { message.setVerified(false); message.setErrorMsg("支付宝 app_id 不匹配"); throw new BusinessException("支付宝 app_id 不匹配"); }
        if (!properties.getAlipay().getSellerId().equals(message.getSellerId())) { message.setVerified(false); message.setErrorMsg("支付宝 seller_id 不匹配"); throw new BusinessException("支付宝 seller_id 不匹配"); }
        message.setOrderNo(message.getParams().get("out_trade_no")); message.setProviderTradeNo(message.getParams().get("trade_no"));
        message.setTradeStatus(message.getParams().get("trade_status")); message.setPaid("TRADE_SUCCESS".equals(message.getTradeStatus()) || "TRADE_FINISHED".equals(message.getTradeStatus()));
        if (message.getParams().get("total_amount") != null) message.setTotalAmount(new java.math.BigDecimal(message.getParams().get("total_amount")));
        return message;
    }
    public PayQueryResponse queryOrder(String outTradeNo) { ensureEnabled(); try { init(); AlipayTradeQueryResponse q = Factory.Payment.Common().query(outTradeNo); PayQueryResponse r = new PayQueryResponse(); r.setProvider(provider()); r.setOrderNo(q.outTradeNo); r.setProviderTradeNo(q.tradeNo); r.setTradeStatus(q.tradeStatus); r.setPaid("TRADE_SUCCESS".equals(q.tradeStatus) || "TRADE_FINISHED".equals(q.tradeStatus)); if (q.totalAmount != null) r.setPaidAmount(new BigDecimal(q.totalAmount)); return r; } catch (Exception ex) { throw new BusinessException("支付宝查单失败"); } }
    public void closeOrder(String outTradeNo) { ensureEnabled(); try { init(); Factory.Payment.Common().close(outTradeNo); } catch (Exception ex) { throw new BusinessException("支付宝关单失败"); } }
    private void ensureEnabled() {
        if (!properties.isEnabled() || !properties.getAlipay().isEnabled() || !StringUtils.hasText(properties.getAlipay().getAppId()) || !StringUtils.hasText(properties.getAlipay().getMerchantPrivateKey()) || !StringUtils.hasText(properties.getAlipay().getAlipayPublicKey()) || !StringUtils.hasText(properties.getAlipay().getNotifyUrl()) || !StringUtils.hasText(properties.getAlipay().getSellerId())) throw new BusinessException("支付宝未启用或配置不完整");
    }
    private void initQuietly() { try { init(); } catch (Exception ex) { throw new BusinessException("支付宝配置初始化失败"); } }
    private void init() { Config c = new Config(); c.protocol = "https"; c.gatewayHost = properties.getAlipay().getServerUrl().replace("https://", "").replace("http://", "").replace("/gateway.do", ""); c.appId = properties.getAlipay().getAppId(); c.signType = properties.getAlipay().getSignType(); c.merchantPrivateKey = properties.getAlipay().getMerchantPrivateKey(); c.alipayPublicKey = properties.getAlipay().getAlipayPublicKey(); c.notifyUrl = properties.getAlipay().getNotifyUrl(); Factory.setOptions(c); }
    private String notifyUrl(PayCreateRequest req) { return StringUtils.hasText(properties.getAlipay().getNotifyUrl()) ? properties.getAlipay().getNotifyUrl() : req.getNotifyUrl(); }
}
