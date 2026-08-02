package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import com.alipay.easysdk.factory.Factory;
import com.alipay.easysdk.kernel.Config;
import com.alipay.easysdk.util.generic.models.AlipayOpenApiGenericResponse;
import com.alipay.easysdk.util.generic.models.AlipayOpenApiGenericSDKResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AlipayAutoDeductPayClient implements PayClient {
    private final PaymentProperties properties;
    private final ObjectMapper objectMapper;

    public AlipayAutoDeductPayClient(PaymentProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override public String provider() { return "alipay_auto_deduct"; }
    @Override public PayCreateResponse createNativeOrder(PayCreateRequest request) { throw new UnsupportedOperationException("支付宝自动续费不支持扫码下单"); }
    @Override public PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message) { return verifyAndParseDeductNotify(message); }
    @Override public PayQueryResponse queryOrder(String outTradeNo) { throw new UnsupportedOperationException("支付宝自动续费暂未实现查单"); }
    @Override public void closeOrder(String outTradeNo) { throw new UnsupportedOperationException("支付宝自动续费不支持关单"); }
    @Override public PayRefundResponse refund(PayRefundRequest request) { throw new UnsupportedOperationException("支付宝自动续费退款请走原支付渠道退款能力"); }

    @Override
    public PayContractSignResponse createContractSign(PayContractSignRequest request) {
        ensureEnabled();
        try {
            initQuietly();
            Map<String, Object> biz = new LinkedHashMap<>();
            biz.put("product_code", productCode());
            biz.put("personal_product_code", "CYCLE_PAY_AUTH_P");
            biz.put("sign_scene", signScene());
            biz.put("external_agreement_no", request.getOutContractCode());
            biz.put("period_rule_params", Map.of(
                "period_type", "MONTH",
                "period", 1,
                "execute_time", StringUtils.hasText(request.getEstimatedDeductDate()) ? request.getEstimatedDeductDate() : LocalDate.now().plusMonths(1).toString(),
                "single_amount", request.getEstimatedDeductAmount() == null ? "0.00" : request.getEstimatedDeductAmount().toPlainString()
            ));
            biz.put("access_params", Map.of("channel", StringUtils.hasText(request.getChannel()) ? request.getChannel() : "QRCODE"));
            AlipayOpenApiGenericSDKResponse sdkResponse = Factory.Util.Generic()
                .asyncNotify(contractNotifyUrl(request.getContractNotifyUrl()))
                .sdkExecute("alipay.user.agreement.page.sign", Map.of(), biz);
            String form = sdkResponse.body;
            PayContractSignResponse response = new PayContractSignResponse();
            response.setProvider(provider());
            response.setOutContractCode(request.getOutContractCode());
            response.setFormHtml(form);
            response.setRedirectUrl(form);
            response.setRawPayload(form);
            return response;
        } catch (Exception exception) {
            throw new BusinessException("支付宝自动续费预签约失败: " + exception.getMessage());
        }
    }

    @Override
    public PayCreateResponse createDeductOrder(PayCreateRequest request) {
        ensureEnabled();
        try {
            initQuietly();
            Map<String, Object> biz = new LinkedHashMap<>();
            biz.put("out_trade_no", request.getOrderNo());
            biz.put("scene", "deduct_pay");
            biz.put("product_code", "CYCLE_PAY_AUTH");
            biz.put("subject", request.getSubject());
            biz.put("total_amount", request.getAmount().toPlainString());
            biz.put("agreement_params", Map.of("agreement_no", request.getContractId()));
            AlipayOpenApiGenericResponse result = Factory.Util.Generic()
                .asyncNotify(deductNotifyUrl(request.getNotifyUrl()))
                .execute("alipay.trade.pay", Map.of(), biz);
            if (!"10000".equals(result.code)) {
                throw new BusinessException("支付宝自动扣款失败: " + result.subMsg);
            }
            JsonNode root = objectMapper.readTree(result.httpBody);
            JsonNode data = root.path("alipay_trade_pay_response");
            PayCreateResponse response = new PayCreateResponse();
            response.setProvider(provider());
            response.setOrderNo(request.getOrderNo());
            response.setAmount(request.getAmount());
            response.setSubject(request.getSubject());
            response.setProviderTradeNo(data.path("trade_no").asText(null));
            response.setRawPayload(result.httpBody);
            return response;
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("支付宝自动扣款失败: " + exception.getMessage());
        }
    }

    @Override
    public void terminateContract(PayContractTerminateRequest request) {
        ensureEnabled();
        try {
            initQuietly();
            AlipayOpenApiGenericResponse response = Factory.Util.Generic().execute(
                "alipay.user.agreement.unsign", Map.of(), Map.of("agreement_no", request.getContractId())
            );
            if (!"10000".equals(response.code)) {
                throw new BusinessException("支付宝自动续费解约失败: " + response.subMsg);
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("支付宝自动续费解约失败: " + exception.getMessage());
        }
    }

    @Override
    public PayNotifyMessage verifyAndParseContractNotify(PayNotifyMessage message) {
        verify(message);
        String notifyType = message.getParams().get("notify_type");
        message.setProvider(provider());
        message.setNotifyId(message.getParams().get("notify_id"));
        message.getParams().put("notify_type", notifyType);
        if (StringUtils.hasText(message.getParams().get("agreement_no"))) {
            message.getParams().put("agreement_no", message.getParams().get("agreement_no"));
        }
        message.getParams().put("change_type", "dut_user_unsign".equalsIgnoreCase(notifyType) ? "DELETE" : "ADD");
        if (StringUtils.hasText(message.getParams().get("external_agreement_no"))) {
            message.getParams().put("out_contract_code", message.getParams().get("external_agreement_no"));
        }
        if (StringUtils.hasText(message.getParams().get("agreement_no"))) {
            message.getParams().put("contract_id", message.getParams().get("agreement_no"));
        }
        return message;
    }

    @Override
    public PayNotifyMessage verifyAndParseDeductNotify(PayNotifyMessage message) {
        verify(message);
        message.setProvider(provider());
        message.setNotifyId(message.getParams().get("notify_id"));
        message.setAppId(message.getParams().get("app_id"));
        message.setSellerId(message.getParams().get("seller_id"));
        message.setOrderNo(message.getParams().get("out_trade_no"));
        message.setProviderTradeNo(message.getParams().get("trade_no"));
        message.setTradeStatus(message.getParams().get("trade_status"));
        message.setPaid("TRADE_SUCCESS".equals(message.getTradeStatus()) || "TRADE_FINISHED".equals(message.getTradeStatus()));
        if (message.getParams().get("total_amount") != null) message.setTotalAmount(new java.math.BigDecimal(message.getParams().get("total_amount")));
        return message;
    }

    private void verify(PayNotifyMessage message) {
        ensureEnabled(); initQuietly();
        try {
            boolean ok = Boolean.TRUE.equals(Factory.Payment.Common().verifyNotify(message.getParams()));
            message.setVerified(ok);
            if (!ok) throw new BusinessException("支付宝自动续费回调验签失败");
        } catch (Exception exception) {
            message.setVerified(false); message.setErrorMsg(exception.getMessage()); throw new BusinessException("支付宝自动续费回调验签失败");
        }
    }

    private void ensureEnabled() { if (!properties.isEnabled() || !properties.getAlipay().isEnabled() || !properties.getAlipay().getAutoDeduct().isEnabled() || !StringUtils.hasText(properties.getAlipay().getAppId()) || !StringUtils.hasText(properties.getAlipay().getMerchantPrivateKey()) || !StringUtils.hasText(properties.getAlipay().getAlipayPublicKey()) || !StringUtils.hasText(properties.getAlipay().getSellerId())) throw new BusinessException("支付宝自动续费未启用或配置不完整"); }
    private void initQuietly() { try { Config c = new Config(); c.protocol = "https"; c.gatewayHost = properties.getAlipay().getServerUrl().replace("https://", "").replace("http://", "").replace("/gateway.do", ""); c.appId = properties.getAlipay().getAppId(); c.signType = properties.getAlipay().getSignType(); c.merchantPrivateKey = properties.getAlipay().getMerchantPrivateKey(); c.alipayPublicKey = properties.getAlipay().getAlipayPublicKey(); c.notifyUrl = properties.getAlipay().getNotifyUrl(); Factory.setOptions(c); } catch (Exception ex) { throw new BusinessException("支付宝配置初始化失败"); } }
    private String productCode() { return StringUtils.hasText(properties.getAlipay().getAutoDeduct().getProductCode()) ? properties.getAlipay().getAutoDeduct().getProductCode() : "GENERAL_WITHHOLDING"; }
    private String signScene() { return StringUtils.hasText(properties.getAlipay().getAutoDeduct().getSignScene()) ? properties.getAlipay().getAutoDeduct().getSignScene() : "INDUSTRY|DEFAULT_SCENE"; }
    private String contractNotifyUrl(String v) { return StringUtils.hasText(v) ? v : properties.getAlipay().getAutoDeduct().getContractNotifyUrl(); }
    private String deductNotifyUrl(String v) { return StringUtils.hasText(v) ? v : properties.getAlipay().getAutoDeduct().getDeductNotifyUrl(); }
}
