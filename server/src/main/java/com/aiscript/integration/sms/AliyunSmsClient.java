package com.aiscript.integration.sms;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.config.SmsProperties;
import com.aliyun.auth.credentials.Credential;
import com.aliyun.auth.credentials.provider.StaticCredentialProvider;
import com.aliyun.sdk.service.dypnsapi20170525.AsyncClient;
import com.aliyun.sdk.service.dypnsapi20170525.models.SendSmsVerifyCodeRequest;
import com.aliyun.sdk.service.dypnsapi20170525.models.SendSmsVerifyCodeResponse;
import darabonba.core.client.ClientOverrideConfiguration;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AliyunSmsClient implements SmsClient {
    private static final Logger log = LoggerFactory.getLogger(AliyunSmsClient.class);
    private static final String DEFAULT_ENDPOINT = "dypnsapi.aliyuncs.com";

    private final SmsProperties smsProperties;
    private volatile AsyncClient client;

    public AliyunSmsClient(SmsProperties smsProperties) {
        this.smsProperties = smsProperties;
    }

    @Override
    public void sendVerificationCode(String phone, String code) {
        ensureConfigured();
        log.info(
            "[SMS_PROVIDER] Aliyun request started: phone={}, endpoint={}, region={}, signName={}, templateCode={}",
            maskPhone(phone),
            normalizeEndpoint(smsProperties.getEndpoint()),
            smsProperties.getRegionId(),
            smsProperties.getSignName(),
            smsProperties.getTemplateCode()
        );
        try {
            int validMinutes = (int) Math.max(1, Math.ceil(smsProperties.getCodeTtlSeconds() / 60.0));
            String templateParam = JsonUtils.toJson(Map.of(
                "code", code,
                "min", String.valueOf(validMinutes)
            ));
            SendSmsVerifyCodeRequest request = SendSmsVerifyCodeRequest.builder()
                .phoneNumber(phone)
                .signName(smsProperties.getSignName())
                .templateCode(smsProperties.getTemplateCode())
                .templateParam(templateParam)
                .build();
            SendSmsVerifyCodeResponse response = client().sendSmsVerifyCode(request).get(10, TimeUnit.SECONDS);
            if (response.getBody() == null || !"OK".equalsIgnoreCase(response.getBody().getCode())) {
                String responseCode = response.getBody() == null ? "EMPTY_RESPONSE" : response.getBody().getCode();
                String responseMessage = response.getBody() == null ? "empty response" : response.getBody().getMessage();
                log.warn(
                    "[SMS_PROVIDER] Aliyun rejected request: phone={}, providerCode={}, providerMessage={}, requestId={}",
                    maskPhone(phone),
                    responseCode,
                    responseMessage,
                    response.getBody() == null ? null : response.getBody().getRequestId()
                );
                throw providerFailure();
            }
            log.info(
                "[SMS_PROVIDER] Aliyun accepted request: phone={}, providerCode={}, requestId={}",
                maskPhone(phone),
                response.getBody().getCode(),
                response.getBody().getRequestId()
            );
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("[SMS_PROVIDER] Aliyun request interrupted: phone={}", maskPhone(phone));
            throw providerFailure();
        } catch (Exception exception) {
            log.error("[SMS_PROVIDER] Aliyun request failed: phone={}", maskPhone(phone), exception);
            throw providerFailure();
        }
    }

    private AsyncClient client() {
        AsyncClient current = client;
        if (current != null) return current;
        synchronized (this) {
            if (client == null) {
                StaticCredentialProvider provider = StaticCredentialProvider.create(
                    Credential.builder()
                        .accessKeyId(smsProperties.getAccessKeyId())
                        .accessKeySecret(smsProperties.getAccessKeySecret())
                        .build()
                );
                client = AsyncClient.builder()
                    .region(smsProperties.getRegionId())
                    .credentialsProvider(provider)
                    .overrideConfiguration(
                        ClientOverrideConfiguration.create()
                            .setEndpointOverride(normalizeEndpoint(smsProperties.getEndpoint()))
                            .setConnectTimeout(Duration.ofSeconds(10))
                    )
                    .build();
            }
            return client;
        }
    }

    private void ensureConfigured() {
        if (!smsProperties.isEnabled()) {
            log.warn("[SMS_CONFIG] SMS service is disabled: property=sms.enabled");
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "短信服务暂不可用，请稍后重试");
        }
        if (!"aliyun".equalsIgnoreCase(smsProperties.getProvider())) {
            log.error("[SMS_CONFIG] Unsupported SMS provider: provider={}", smsProperties.getProvider());
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "短信服务配置异常，请联系管理员");
        }
        List<String> missingItems = new ArrayList<>();
        addMissing(missingItems, "sms.access-key-id", smsProperties.getAccessKeyId());
        addMissing(missingItems, "sms.access-key-secret", smsProperties.getAccessKeySecret());
        addMissing(missingItems, "sms.sign-name", smsProperties.getSignName());
        addMissing(missingItems, "sms.template-code", smsProperties.getTemplateCode());
        if (!missingItems.isEmpty()) {
            log.error("[SMS_CONFIG] Aliyun SMS configuration is incomplete: missing={}", missingItems);
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "短信服务配置异常，请联系管理员");
        }
    }

    private void addMissing(List<String> missingItems, String propertyName, String value) {
        if (!StringUtils.hasText(value)) {
            missingItems.add(propertyName);
        }
    }

    private String normalizeEndpoint(String value) {
        String endpoint = StringUtils.hasText(value) ? value.trim() : DEFAULT_ENDPOINT;
        endpoint = endpoint.replaceFirst("(?i)^https?://", "").replaceFirst("/+$", "");
        if (!StringUtils.hasText(endpoint) || endpoint.contains("/") || endpoint.contains(" ")) {
            log.error("Invalid Aliyun SMS endpoint configuration");
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "短信服务配置异常，请联系管理员");
        }
        return endpoint;
    }

    private BusinessException providerFailure() {
        return new BusinessException(ResultCode.PROVIDER_ERROR, "短信验证码发送失败，请稍后重试");
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    @PreDestroy
    public void close() {
        AsyncClient current = client;
        if (current != null) {
            current.close();
        }
    }
}
