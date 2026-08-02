package com.aiscript.integration.pay;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.config.PaymentProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wechat.pay.java.core.RSAAutoCertificateConfig;
import com.wechat.pay.java.core.http.DefaultHttpClientBuilder;
import com.wechat.pay.java.core.http.HttpClient;
import com.wechat.pay.java.core.http.HttpHeaders;
import com.wechat.pay.java.core.http.HttpResponse;
import com.wechat.pay.java.core.http.JsonRequestBody;
import com.wechat.pay.java.core.notification.NotificationParser;
import com.wechat.pay.java.core.notification.RequestParam;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class WechatAutoDeductPayClient implements PayClient {
    private final PaymentProperties properties;
    private final ObjectMapper objectMapper;

    public WechatAutoDeductPayClient(PaymentProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override public String provider() { return "wechat_auto_deduct"; }
    @Override public PayCreateResponse createNativeOrder(PayCreateRequest request) { throw new UnsupportedOperationException("周期扣费不支持Native下单"); }
    @Override public PayQueryResponse queryOrder(String outTradeNo) { throw new UnsupportedOperationException("周期扣费暂未实现查单"); }
    @Override public void closeOrder(String outTradeNo) { throw new UnsupportedOperationException("周期扣费不支持关闭Native订单"); }
    @Override public PayRefundResponse refund(PayRefundRequest request) { throw new UnsupportedOperationException("周期扣费退款请走原支付渠道退款能力"); }
    @Override public PayNotifyMessage verifyAndParseNotify(PayNotifyMessage message) { return verifyAndParseDeductNotify(message); }

    @Override
    public PayContractSignResponse createContractSign(PayContractSignRequest request) {
        ensureEnabled();
        try {
            String channel = StringUtils.hasText(request.getChannel()) ? request.getChannel() : "h5";
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("appid", properties.getWechat().getAppId());
            body.put("plan_id", planId(request.getPlanId()));
            body.put("out_contract_code", request.getOutContractCode());
            body.put("contract_display_account", request.getContractDisplayAccount());
            body.put("contract_notify_url", contractNotifyUrl(request.getContractNotifyUrl()));
            if (StringUtils.hasText(request.getOpenid())) body.put("openid", request.getOpenid());
            Map<String, Object> schedule = new LinkedHashMap<>();
            schedule.put("estimated_deduct_date", StringUtils.hasText(request.getEstimatedDeductDate()) ? request.getEstimatedDeductDate() : LocalDate.now().plusMonths(1).toString());
            if (request.getEstimatedDeductAmount() != null) schedule.put("estimated_deduct_amount", toFen(request.getEstimatedDeductAmount()));
            body.put("deduct_schedule", schedule);
            Map<String, Object> resp = post("https://api.mch.weixin.qq.com/v3/papay/scheduled-deduct-sign/contracts/pre-entrust-sign/" + channel, body);
            PayContractSignResponse r = new PayContractSignResponse();
            r.setProvider(provider()); r.setOutContractCode(request.getOutContractCode());
            r.setPreEntrustwebId(str(resp.get("pre_entrustweb_id"))); r.setRedirectUrl(str(resp.get("redirect_url")));
            r.setMiniProgramUsername(str(resp.get("miniprogram_username"))); r.setRawPayload(objectMapper.writeValueAsString(resp));
            return r;
        } catch (Exception ex) { throw new BusinessException("微信周期扣费预签约失败: " + ex.getMessage()); }
    }

    @Override
    public PayCreateResponse createDeductOrder(PayCreateRequest request) {
        ensureEnabled();
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("appid", properties.getWechat().getAppId());
            body.put("out_trade_no", request.getOrderNo());
            body.put("description", request.getSubject());
            body.put("transaction_notify_url", deductNotifyUrl(request.getNotifyUrl()));
            body.put("contract_id", request.getContractId());
            body.put("amount", Map.of("total", toFen(request.getAmount()), "currency", "CNY"));
            Map<String, Object> resp = post("https://api.mch.weixin.qq.com/v3/papay/pay/transactions/apply", body);
            PayCreateResponse r = new PayCreateResponse(); r.setProvider(provider()); r.setOrderNo(request.getOrderNo()); r.setAmount(request.getAmount()); r.setSubject(request.getSubject()); r.setRawPayload(objectMapper.writeValueAsString(resp)); r.setProviderTradeNo(str(resp.get("transaction_id"))); return r;
        } catch (Exception ex) { throw new BusinessException("微信周期扣款下单失败: " + ex.getMessage()); }
    }

    @Override public PayNotifyMessage verifyAndParseContractNotify(PayNotifyMessage message) { return parseGenericNotify(message, false); }
    @Override public PayNotifyMessage verifyAndParseDeductNotify(PayNotifyMessage message) { return parseGenericNotify(message, true); }

    @Override
    public void terminateContract(PayContractTerminateRequest request) {
        ensureEnabled();
        try {
            String path = "https://api.mch.weixin.qq.com/v3/papay/sign/contracts/plan-id/" + planId(request.getPlanId()) + "/out-contract-code/" + request.getOutContractCode() + "/terminate";
            post(path, Map.of("contract_termination_remark", StringUtils.hasText(request.getReason()) ? request.getReason() : "用户取消自动续费"));
        } catch (Exception ex) { throw new BusinessException("微信周期扣费解约失败: " + ex.getMessage()); }
    }

    private PayNotifyMessage parseGenericNotify(PayNotifyMessage message, boolean payment) {
        ensureEnabled();
        try {
            RequestParam p = new RequestParam.Builder().serialNumber(header(message, "Wechatpay-Serial")).nonce(header(message, "Wechatpay-Nonce")).signature(header(message, "Wechatpay-Signature")).timestamp(header(message, "Wechatpay-Timestamp")).body(message.getRawBody()).build();
            Map<String, Object> data = new NotificationParser(config()).parse(p, Map.class);
            message.setProvider(provider()); message.setVerified(true); message.setParams(flat(data));
            if (!payment) {
                message.getParams().put("change_type", any(data, "change_type"));
                message.getParams().put("contract_id", any(data, "contract_id"));
                message.getParams().put("out_contract_code", any(data, "out_contract_code"));
            }
            if (payment) { message.setOrderNo(any(data, "out_trade_no")); message.setProviderTradeNo(any(data, "transaction_id")); message.setTradeStatus(any(data, "trade_state", "trade_status")); message.setPaid("SUCCESS".equalsIgnoreCase(message.getTradeStatus())); Object amount = data.get("amount"); if (amount instanceof Map<?, ?> m) message.setTotalAmount(yuan(asInt(m.get("payer_total") == null ? m.get("total") : m.get("payer_total")))); }
            return message;
        } catch (Exception ex) { message.setVerified(false); message.setErrorMsg(ex.getMessage()); throw new BusinessException("微信周期扣费回调验签失败"); }
    }

    private Map<String, Object> post(String url, Map<String, Object> body) throws Exception {
        HttpResponse<Map> response = httpClient().post(new HttpHeaders(), url, new JsonRequestBody.Builder().body(objectMapper.writeValueAsString(body)).build(), Map.class);
        return objectMapper.convertValue(response.getServiceResponse(), new TypeReference<>() {});
    }
    private void ensureEnabled() { if (!properties.isEnabled() || !properties.getWechat().isEnabled() || !properties.getWechat().getAutoDeduct().isEnabled() || !StringUtils.hasText(properties.getWechat().getAppId()) || !StringUtils.hasText(properties.getWechat().getMchId()) || !StringUtils.hasText(properties.getWechat().getApiV3Key()) || !StringUtils.hasText(properties.getWechat().getPrivateKeyPath()) || !StringUtils.hasText(properties.getWechat().getMchSerialNo()) || !StringUtils.hasText(properties.getWechat().getAutoDeduct().getPlanId())) throw new BusinessException("微信周期扣费未启用或配置不完整"); }
    private RSAAutoCertificateConfig config() { return new RSAAutoCertificateConfig.Builder().merchantId(properties.getWechat().getMchId()).privateKeyFromPath(properties.getWechat().getPrivateKeyPath()).merchantSerialNumber(properties.getWechat().getMchSerialNo()).apiV3Key(properties.getWechat().getApiV3Key()).build(); }
    private HttpClient httpClient() { return new DefaultHttpClientBuilder().config(config()).build(); }
    private String planId(String v) { return StringUtils.hasText(v) ? v : properties.getWechat().getAutoDeduct().getPlanId(); }
    private String contractNotifyUrl(String v) { return StringUtils.hasText(v) ? v : properties.getWechat().getAutoDeduct().getContractNotifyUrl(); }
    private String deductNotifyUrl(String v) { return StringUtils.hasText(v) ? v : properties.getWechat().getAutoDeduct().getDeductNotifyUrl(); }
    private Integer toFen(BigDecimal amount) { return amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValueExact(); }
    private BigDecimal yuan(Integer fen) { return fen == null ? null : BigDecimal.valueOf(fen).divide(BigDecimal.valueOf(100), 2, RoundingMode.UNNECESSARY); }
    private String header(PayNotifyMessage m, String name) { return m.getHeaders().getOrDefault(name, m.getHeaders().get(name.toLowerCase())); }
    private String str(Object v) { return v == null ? null : String.valueOf(v); }
    private Integer asInt(Object v) { return v == null ? null : Integer.valueOf(String.valueOf(v)); }
    private String any(Map<String, Object> map, String... keys) { for (String key : keys) if (map.get(key) != null) return str(map.get(key)); return null; }
    private Map<String, String> flat(Map<String, Object> data) { Map<String, String> r = new LinkedHashMap<>(); data.forEach((k, v) -> r.put(k, str(v))); return r; }
}
