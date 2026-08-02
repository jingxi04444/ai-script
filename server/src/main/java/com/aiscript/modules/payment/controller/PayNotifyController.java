package com.aiscript.modules.payment.controller;

import com.aiscript.integration.pay.PayClientRouter;
import com.aiscript.integration.pay.PayNotifyMessage;
import com.aiscript.modules.payment.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/notify")
public class PayNotifyController {
    private final PayClientRouter router;
    private final PaymentService paymentService;
    public PayNotifyController(PayClientRouter router, PaymentService paymentService) { this.router = router; this.paymentService = paymentService; }

    @PostMapping(value = "/wechat/native", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> wechat(HttpServletRequest request) throws IOException {
        try {
            PayNotifyMessage msg = new PayNotifyMessage(); msg.setProvider("wechat"); msg.setRawBody(new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
            msg.getHeaders().put("Wechatpay-Timestamp", request.getHeader("Wechatpay-Timestamp"));
            msg.getHeaders().put("Wechatpay-Nonce", request.getHeader("Wechatpay-Nonce"));
            msg.getHeaders().put("Wechatpay-Signature", request.getHeader("Wechatpay-Signature"));
            msg.getHeaders().put("Wechatpay-Serial", request.getHeader("Wechatpay-Serial"));
            msg.setSignature(request.getHeader("Wechatpay-Signature"));
            router.route("wechat", "wechat_native").verifyAndParseNotify(msg); paymentService.handleProviderNotify(msg);
            return ResponseEntity.ok(Map.of("code", "SUCCESS", "message", "成功"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("code", "FAIL", "message", ex.getMessage() == null ? "失败" : ex.getMessage()));
        }
    }

    @PostMapping(value = "/wechat/contract", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> wechatContract(HttpServletRequest request) throws IOException {
        try {
            PayNotifyMessage msg = wechatMessage(request, "wechat_auto_deduct");
            router.route("wechat_auto_deduct", "wechat_auto_deduct").verifyAndParseContractNotify(msg);
            paymentService.handleContractNotify(msg);
            return ResponseEntity.ok(Map.of("code", "SUCCESS", "message", "成功"));
        } catch (Exception ex) { return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("code", "FAIL", "message", ex.getMessage() == null ? "失败" : ex.getMessage())); }
    }

    @PostMapping(value = "/wechat/deduct", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> wechatDeduct(HttpServletRequest request) throws IOException {
        try {
            PayNotifyMessage msg = wechatMessage(request, "wechat_auto_deduct");
            router.route("wechat_auto_deduct", "wechat_auto_deduct").verifyAndParseDeductNotify(msg);
            paymentService.handleProviderNotify(msg);
            return ResponseEntity.ok(Map.of("code", "SUCCESS", "message", "成功"));
        } catch (Exception ex) { return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("code", "FAIL", "message", ex.getMessage() == null ? "失败" : ex.getMessage())); }
    }

    private PayNotifyMessage wechatMessage(HttpServletRequest request, String provider) throws IOException {
        PayNotifyMessage msg = new PayNotifyMessage(); msg.setProvider(provider); msg.setRawBody(new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        msg.getHeaders().put("Wechatpay-Timestamp", request.getHeader("Wechatpay-Timestamp"));
        msg.getHeaders().put("Wechatpay-Nonce", request.getHeader("Wechatpay-Nonce"));
        msg.getHeaders().put("Wechatpay-Signature", request.getHeader("Wechatpay-Signature"));
        msg.getHeaders().put("Wechatpay-Serial", request.getHeader("Wechatpay-Serial"));
        msg.setSignature(request.getHeader("Wechatpay-Signature"));
        return msg;
    }

    @PostMapping(value = "/alipay/scan", produces = MediaType.TEXT_PLAIN_VALUE)
    public String alipay(@RequestParam Map<String, String> params) {
        try {
            PayNotifyMessage msg = new PayNotifyMessage(); msg.setProvider("alipay"); msg.setParams(new HashMap<>(params));
            router.route("alipay", "alipay_scan").verifyAndParseNotify(msg); paymentService.handleProviderNotify(msg); return "success";
        } catch (Exception ex) { return "fail"; }
    }

    @PostMapping(value = "/alipay/contract", produces = MediaType.TEXT_PLAIN_VALUE)
    public String alipayContract(@RequestParam Map<String, String> params) {
        try {
            PayNotifyMessage msg = new PayNotifyMessage(); msg.setProvider("alipay_auto_deduct"); msg.setParams(new HashMap<>(params));
            router.route("alipay_auto_deduct", "alipay_auto_deduct").verifyAndParseContractNotify(msg);
            paymentService.handleContractNotify(msg);
            return "success";
        } catch (Exception ex) { return "fail"; }
    }

    @PostMapping(value = "/alipay/deduct", produces = MediaType.TEXT_PLAIN_VALUE)
    public String alipayDeduct(@RequestParam Map<String, String> params) {
        try {
            PayNotifyMessage msg = new PayNotifyMessage(); msg.setProvider("alipay_auto_deduct"); msg.setParams(new HashMap<>(params));
            router.route("alipay_auto_deduct", "alipay_auto_deduct").verifyAndParseDeductNotify(msg);
            paymentService.handleProviderNotify(msg);
            return "success";
        } catch (Exception ex) { return "fail"; }
    }
}
