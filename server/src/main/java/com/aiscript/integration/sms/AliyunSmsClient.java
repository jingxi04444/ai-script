package com.aiscript.integration.sms;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AliyunSmsClient implements SmsClient {
    private static final String DEFAULT_ENDPOINT = "https://dysmsapi.aliyuncs.com/";
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient;

    public AliyunSmsClient(ProviderConfigService providerConfigService, SecretCipherService secretCipherService) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    public void sendVerificationCode(String phone, String code) {
        SysApiProviderConfig provider = providerConfigService.firstEnabled("sms");
        if (provider == null) {
            throw new BusinessException("未配置短信Provider");
        }
        Map<String, Object> config = JsonUtils.toMap(provider.getConfigJson());
        String accessKeyId = String.valueOf(config.getOrDefault("accessKeyId", ""));
        String accessKeySecret = secretCipherService.decrypt(provider.getApiKeyEncrypted());
        String signName = String.valueOf(config.getOrDefault("signName", ""));
        String templateCode = String.valueOf(config.getOrDefault("templateCode", ""));
        if (!StringUtils.hasText(accessKeyId) || !StringUtils.hasText(accessKeySecret)
            || !StringUtils.hasText(signName) || !StringUtils.hasText(templateCode)) {
            throw new BusinessException("短信Provider配置不完整");
        }
        TreeMap<String, String> params = new TreeMap<>();
        params.put("AccessKeyId", accessKeyId);
        params.put("Action", "SendSms");
        params.put("Format", "JSON");
        params.put("PhoneNumbers", phone);
        params.put("RegionId", String.valueOf(config.getOrDefault("regionId", "cn-hangzhou")));
        params.put("SignName", signName);
        params.put("SignatureMethod", "HMAC-SHA1");
        params.put("SignatureNonce", UUID.randomUUID().toString());
        params.put("SignatureVersion", "1.0");
        params.put("TemplateCode", templateCode);
        params.put("TemplateParam", JsonUtils.toJson(Map.of("code", code)));
        params.put("Timestamp", DateTimeFormatter.ISO_INSTANT.format(Instant.now().atOffset(ZoneOffset.UTC)));
        params.put("Version", "2017-05-25");
        params.put("Signature", signature(params, accessKeySecret));
        String endpoint = StringUtils.hasText(provider.getEndpointUrl()) ? provider.getEndpointUrl() : DEFAULT_ENDPOINT;
        String url = endpoint + "?" + canonicalizedQuery(params);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 8000 : provider.getTimeoutMs()))
            .GET()
            .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300 || !response.body().contains("\"Code\":\"OK\"")) {
                throw new BusinessException("阿里云短信发送失败：" + response.body());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("阿里云短信发送被中断");
        } catch (Exception ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("阿里云短信发送失败：" + ex.getMessage());
        }
    }

    private String signature(TreeMap<String, String> params, String accessKeySecret) {
        String stringToSign = "GET&%2F&" + percentEncode(canonicalizedQuery(params));
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec((accessKeySecret + "&").getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            return java.util.Base64.getEncoder().encodeToString(mac.doFinal(stringToSign.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new BusinessException("阿里云短信签名失败");
        }
    }

    private String canonicalizedQuery(TreeMap<String, String> params) {
        return params.entrySet().stream()
            .map(entry -> percentEncode(entry.getKey()) + "=" + percentEncode(entry.getValue()))
            .reduce((left, right) -> left + "&" + right)
            .orElse("");
    }

    private String percentEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8)
            .replace("+", "%20")
            .replace("*", "%2A")
            .replace("%7E", "~");
    }
}
