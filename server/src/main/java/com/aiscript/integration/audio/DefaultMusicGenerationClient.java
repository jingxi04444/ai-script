package com.aiscript.integration.audio;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.integration.provider.AsyncProviderJobClient;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultMusicGenerationClient implements MusicGenerationClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final AsyncProviderJobClient asyncProviderJobClient;

    public DefaultMusicGenerationClient(
        ProviderConfigService providerConfigService,
        SecretCipherService secretCipherService,
        AsyncProviderJobClient asyncProviderJobClient
    ) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.asyncProviderJobClient = asyncProviderJobClient;
    }

    @Override
    public Map<String, Object> generate(String prompt, Map<String, Object> options) {
        String requestedModel = text(options, "model");
        SysApiProviderConfig provider = providerConfigService.resolveEnabled("music", requestedModel);
        if (provider == null && StringUtils.hasText(requestedModel)) provider = providerConfigService.firstEnabled("music");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "未配置音乐生成 Provider（music）");
        }
        Map<String, Object> providerConfig = JsonUtils.toMap(provider.getConfigJson());
        Map<String, Object> payload = new LinkedHashMap<>();
        Object defaults = providerConfig.get("request_defaults");
        if (defaults instanceof Map<?, ?> values) {
            values.forEach((key, value) -> payload.put(String.valueOf(key), value));
        }
        if (providerConfig.get("model") != null) payload.put("model", providerConfig.get("model"));
        payload.put("prompt", prompt == null ? "" : prompt);
        copy(options, payload, "musicStyle");
        copy(options, payload, "durationSeconds");

        HttpRequest.Builder request = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 180_000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            request.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "音乐 Provider 调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            if (asyncProviderJobClient.enabled(provider)) {
                return asyncProviderJobClient.acceptSubmission(provider, body);
            }
            String url = url(body);
            if (!StringUtils.hasText(url)) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "音乐 Provider 未返回可识别的音频地址");
            }
            return Map.of("assetUrl", url, "provider", provider.getProviderName());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "音乐 Provider 调用被中断");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "音乐 Provider 调用失败：" + exception.getMessage());
        }
    }

    private String url(Map<String, Object> body) {
        if (body.get("url") != null) return String.valueOf(body.get("url"));
        if (body.get("audio_url") != null) return String.valueOf(body.get("audio_url"));
        Object data = body.get("data");
        if (data instanceof Map<?, ?> map) {
            if (map.get("url") != null) return String.valueOf(map.get("url"));
            if (map.get("audio_url") != null) return String.valueOf(map.get("audio_url"));
        }
        return null;
    }

    private String text(Map<String, Object> values, String key) {
        Object value = values == null ? null : values.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private void copy(Map<String, Object> source, Map<String, Object> target, String key) {
        if (source != null && source.get(key) != null) target.put(key, source.get(key));
    }
}
