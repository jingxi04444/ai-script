package com.aiscript.integration.video;

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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultVideoAssemblyClient implements VideoAssemblyClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final AsyncProviderJobClient asyncProviderJobClient;

    public DefaultVideoAssemblyClient(
        ProviderConfigService providerConfigService,
        SecretCipherService secretCipherService,
        AsyncProviderJobClient asyncProviderJobClient
    ) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.asyncProviderJobClient = asyncProviderJobClient;
    }

    @Override
    public Map<String, Object> assemble(List<String> clipUrls, Map<String, Object> options) {
        String requestedModel = options == null || options.get("model") == null
            ? null
            : String.valueOf(options.get("model"));
        SysApiProviderConfig provider = providerConfigService.resolveEnabled("editor", requestedModel);
        if (provider == null) provider = providerConfigService.resolveEnabled("video_editor", requestedModel);
        if (provider == null && StringUtils.hasText(requestedModel)) provider = providerConfigService.firstEnabled("editor");
        if (provider == null && StringUtils.hasText(requestedModel)) provider = providerConfigService.firstEnabled("video_editor");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "未配置视频合成 Provider（editor/video_editor）");
        }
        Map<String, Object> providerConfig = JsonUtils.toMap(provider.getConfigJson());
        Map<String, Object> payload = new LinkedHashMap<>();
        Object defaults = providerConfig.get("request_defaults");
        if (defaults instanceof Map<?, ?> values) {
            values.forEach((key, value) -> payload.put(String.valueOf(key), value));
        }
        if (providerConfig.get("model") != null) payload.put("model", providerConfig.get("model"));
        else if (StringUtils.hasText(requestedModel)) payload.put("model", requestedModel);
        payload.put("clips", clipUrls == null ? List.of() : clipUrls);
        payload.put("outputCount", count(options));
        if (options != null) {
            copyIfPresent(options, payload, "script");
            copyIfPresent(options, payload, "musicUrl");
            copyIfPresent(options, payload, "voiceUrl");
            copyIfPresent(options, payload, "aspectRatio");
            copyIfPresent(options, payload, "durationSeconds");
        }

        HttpRequest.Builder request = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 300_000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            request.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "视频合成 Provider 调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            if (asyncProviderJobClient.enabled(provider)) {
                return asyncProviderJobClient.acceptSubmission(provider, body);
            }
            List<String> urls = new ArrayList<>();
            collectUrls(body.get("data"), urls);
            collectUrls(body.get("output"), urls);
            collectUrls(body.get("urls"), urls);
            collectUrls(body.get("url"), urls);
            if (urls.isEmpty()) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "视频合成 Provider 未返回可识别的视频地址");
            }
            return Map.of(
                "assetUrl", urls.get(0),
                "assetUrls", urls,
                "outputCount", urls.size(),
                "provider", provider.getProviderName()
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "视频合成 Provider 调用被中断");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "视频合成 Provider 调用失败：" + exception.getMessage());
        }
    }

    private int count(Map<String, Object> options) {
        Object value = options == null ? null : options.get("outputCount");
        int count = value instanceof Number number ? number.intValue() : 10;
        return Math.max(1, Math.min(20, count));
    }

    private void copyIfPresent(Map<String, Object> source, Map<String, Object> target, String key) {
        if (source.get(key) != null) target.put(key, source.get(key));
    }

    private void collectUrls(Object value, List<String> urls) {
        if (value instanceof String text && StringUtils.hasText(text)) {
            urls.add(text);
        } else if (value instanceof List<?> list) {
            list.forEach(item -> collectUrls(item, urls));
        } else if (value instanceof Map<?, ?> map) {
            Object url = map.get("url");
            if (url != null) collectUrls(url, urls);
            Object videoUrl = map.get("video_url");
            if (videoUrl != null) collectUrls(videoUrl, urls);
        }
    }
}
