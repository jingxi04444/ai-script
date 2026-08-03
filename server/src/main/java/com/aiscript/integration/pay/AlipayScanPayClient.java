package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import com.alipay.easysdk.factory.Factory;
import com.alipay.easysdk.kernel.Config;
import com.alipay.easysdk.payment.common.models.AlipayTradeQueryResponse;
import com.alipay.easysdk.payment.common.models.AlipayTradeFastpayRefundQueryResponse;
import com.alipay.easysdk.payment.common.models.AlipayTradeRefundResponse;
import com.alipay.easysdk.payment.page.models.AlipayTradePagePayResponse;
import java.math.BigDecimal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
public class AlipayScanPayClient implements PayClient {
    private final PaymentProperties properties;
    public AlipayScanPayClient(PaymentProperties properties) { this.properties = properties; }
    public String provider() { return "alipay"; }
    public PayCreateResponse createNativeOrder(PayCreateRequest request) {
        ensureEnabled();
        try {
            init();
            String returnUrl = StringUtils.hasText(request.getReturnUrl())
                ? request.getReturnUrl()
                : properties.getFrontReturnUrl();
            if (!StringUtils.hasText(returnUrl)) {
                throw new BusinessException("支付宝电脑网站支付回跳地址未配置");
            }
            AlipayTradePagePayResponse resp = Factory.Payment.Page()
                .asyncNotify(notifyUrl(request))
                .optional("timeout_express", "15m")
                .pay(request.getSubject(), request.getOrderNo(), request.getAmount().toPlainString(), returnUrl);
            if (!StringUtils.hasText(resp.body)) {
                throw new BusinessException("支付宝电脑网站支付下单失败: 未返回收银台表单");
            }
            PayCreateResponse response = new PayCreateResponse();
            response.setProvider(provider());
            response.setOrderNo(request.getOrderNo());
            response.setAmount(request.getAmount());
            response.setSubject(request.getSubject());
            response.setFormHtml(resp.body);
            return response;
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("支付宝下单调用异常, orderNo={}", request.getOrderNo(), exception);
            throw new BusinessException("支付宝下单失败，请稍后重试");
        }
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
    public PayQueryResponse queryOrder(String outTradeNo) {
        ensureEnabled();
        try {
            init();
            AlipayTradeQueryResponse result = Factory.Payment.Common().query(outTradeNo);
            if (!"10000".equals(result.code)) {
                throw new BusinessException(providerError("支付宝查单失败", result.code, result.subCode, result.subMsg));
            }
            PayQueryResponse response = new PayQueryResponse();
            response.setProvider(provider());
            response.setOrderNo(result.outTradeNo);
            response.setProviderTradeNo(result.tradeNo);
            response.setTradeStatus(result.tradeStatus);
            response.setPaid("TRADE_SUCCESS".equals(result.tradeStatus) || "TRADE_FINISHED".equals(result.tradeStatus));
            if (StringUtils.hasText(result.totalAmount)) response.setPaidAmount(new BigDecimal(result.totalAmount));
            return response;
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("支付宝查单调用异常, orderNo={}", outTradeNo, exception);
            throw new BusinessException("支付宝查单失败，请稍后重试");
        }
    }

    public void closeOrder(String outTradeNo) {
        ensureEnabled();
        try {
            init();
            var result = Factory.Payment.Common().close(outTradeNo);
            if (!"10000".equals(result.code)) {
                throw new BusinessException(providerError("支付宝关单失败", result.code, result.subCode, result.subMsg));
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("支付宝关单调用异常, orderNo={}", outTradeNo, exception);
            throw new BusinessException("支付宝关单失败，请稍后重试");
        }
    }

    public PayRefundResponse refund(PayRefundRequest request) {
        ensureEnabled();
        validateRefundRequest(request);
        try {
            init();
            var client = Factory.Payment.Common().optional("out_request_no", request.getRefundNo());
            if (StringUtils.hasText(request.getReason())) client = client.optional("refund_reason", request.getReason());
            AlipayTradeRefundResponse result = client.refund(request.getOrderNo(), request.getRefundAmount().toPlainString());
            return mapRefundResponse(request, result);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("支付宝退款调用异常, orderNo={}, refundNo={}", request.getOrderNo(), request.getRefundNo(), exception);
            throw new BusinessException("支付宝退款请求异常，请通过退款查询确认结果");
        }
    }

    @Override
    public PayRefundResponse queryRefund(PayRefundRequest request) {
        ensureEnabled();
        validateRefundRequest(request);
        try {
            init();
            AlipayTradeFastpayRefundQueryResponse result = Factory.Payment.Common()
                .queryRefund(request.getOrderNo(), request.getRefundNo());
            return mapRefundQueryResponse(request, result);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("支付宝退款查询异常, orderNo={}, refundNo={}", request.getOrderNo(), request.getRefundNo(), exception);
            throw new BusinessException("支付宝退款结果暂时无法确认，请稍后重试");
        }
    }

    PayRefundResponse mapRefundResponse(PayRefundRequest request, AlipayTradeRefundResponse result) {
        if (!"10000".equals(result.code)) {
            if (isUncertain(result.code, result.subCode)) {
                log.warn("支付宝退款结果不确定, orderNo={}, refundNo={}, code={}, subCode={}",
                    request.getOrderNo(), request.getRefundNo(), result.code, result.subCode);
                return pendingRefundResponse(request, result.tradeNo, "REFUND_UNKNOWN", result.httpBody);
            }
            throw new BusinessException(providerError("支付宝退款失败", result.code, result.subCode, result.subMsg));
        }
        boolean success = "Y".equalsIgnoreCase(result.fundChange);
        String providerRefundNo = StringUtils.hasText(result.refundSettlementId)
            ? result.refundSettlementId : result.tradeNo;
        return refundResponse(request, providerRefundNo,
            success ? "REFUND_SUCCESS" : "REFUND_PROCESSING", success, result.httpBody);
    }

    PayRefundResponse mapRefundQueryResponse(
        PayRefundRequest request,
        AlipayTradeFastpayRefundQueryResponse result
    ) {
        if (!"10000".equals(result.code)) {
            if (isUncertain(result.code, result.subCode)) {
                return pendingRefundResponse(request, result.tradeNo, "REFUND_QUERY_PENDING", result.httpBody);
            }
            throw new BusinessException(providerError("支付宝退款查询失败", result.code, result.subCode, result.subMsg));
        }
        boolean success = "REFUND_SUCCESS".equals(result.refundStatus);
        String providerRefundNo = StringUtils.hasText(result.refundSettlementId)
            ? result.refundSettlementId : result.tradeNo;
        String status = StringUtils.hasText(result.refundStatus) ? result.refundStatus : "REFUND_PROCESSING";
        return refundResponse(request, providerRefundNo, status, success, result.httpBody);
    }

    private PayRefundResponse pendingRefundResponse(
        PayRefundRequest request,
        String providerRefundNo,
        String status,
        String rawPayload
    ) {
        return refundResponse(request, providerRefundNo, status, false, rawPayload);
    }

    private PayRefundResponse refundResponse(
        PayRefundRequest request,
        String providerRefundNo,
        String status,
        boolean success,
        String rawPayload
    ) {
        PayRefundResponse response = new PayRefundResponse();
        response.setRefundNo(request.getRefundNo());
        response.setProviderRefundNo(providerRefundNo);
        response.setStatus(status);
        response.setSuccess(success);
        response.setRawPayload(rawPayload);
        return response;
    }

    private void validateRefundRequest(PayRefundRequest request) {
        if (request == null || !StringUtils.hasText(request.getOrderNo())
            || !StringUtils.hasText(request.getRefundNo()) || request.getRefundAmount() == null
            || request.getRefundAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("支付宝退款参数不完整");
        }
    }

    private boolean isUncertain(String code, String subCode) {
        if ("20000".equals(code)) return true;
        if (!StringUtils.hasText(subCode)) return false;
        String normalized = subCode.toUpperCase();
        return normalized.contains("SYSTEM_ERROR") || normalized.contains("UNKNOWN_ERROR")
            || normalized.contains("UNKNOW_ERROR");
    }

    private String providerError(String prefix, String code, String subCode, String subMsg) {
        String detail = StringUtils.hasText(subMsg) ? subMsg
            : (StringUtils.hasText(subCode) ? subCode : code);
        return prefix + (StringUtils.hasText(detail) ? ": " + detail : "");
    }

    private void ensureEnabled() {
        if (!properties.isEnabled() || !properties.getAlipay().isEnabled() || !StringUtils.hasText(properties.getAlipay().getAppId()) || !StringUtils.hasText(properties.getAlipay().getMerchantPrivateKey()) || !StringUtils.hasText(properties.getAlipay().getAlipayPublicKey()) || !StringUtils.hasText(properties.getAlipay().getNotifyUrl()) || !StringUtils.hasText(properties.getAlipay().getSellerId())) throw new BusinessException("支付宝未启用或配置不完整");
    }
    private void initQuietly() { try { init(); } catch (Exception ex) { throw new BusinessException("支付宝配置初始化失败"); } }
    private void init() { Config c = new Config(); c.protocol = "https"; c.gatewayHost = properties.getAlipay().getServerUrl().replace("https://", "").replace("http://", "").replace("/gateway.do", ""); c.appId = properties.getAlipay().getAppId(); c.signType = properties.getAlipay().getSignType(); c.merchantPrivateKey = properties.getAlipay().getMerchantPrivateKey(); c.alipayPublicKey = properties.getAlipay().getAlipayPublicKey(); c.notifyUrl = properties.getAlipay().getNotifyUrl(); Factory.setOptions(c); }
    private String notifyUrl(PayCreateRequest req) { return StringUtils.hasText(properties.getAlipay().getNotifyUrl()) ? properties.getAlipay().getNotifyUrl() : req.getNotifyUrl(); }
}
