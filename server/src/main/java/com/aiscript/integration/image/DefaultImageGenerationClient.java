package com.aiscript.integration.image;

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
public class DefaultImageGenerationClient implements ImageGenerationClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final AsyncProviderJobClient asyncProviderJobClient;

    public DefaultImageGenerationClient(
        ProviderConfigService providerConfigService,
        SecretCipherService secretCipherService,
        AsyncProviderJobClient asyncProviderJobClient
    ) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.asyncProviderJobClient = asyncProviderJobClient;
    }

    @Override
    public Map<String, Object> generate(String prompt, List<String> referenceUrls, Map<String, Object> options) {
        String requestedModel = stringOption(options, "model");
        SysApiProviderConfig provider = providerConfigService.resolveEnabled("image", requestedModel);
        if (provider == null) provider = providerConfigService.resolveEnabled("vision", requestedModel);
        if (provider == null && StringUtils.hasText(requestedModel)) provider = providerConfigService.firstEnabled("image");
        if (provider == null && StringUtils.hasText(requestedModel)) provider = providerConfigService.firstEnabled("vision");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "未配置图片生成 Provider（image/vision）");
        }
        Map<String, Object> providerConfig = JsonUtils.toMap(provider.getConfigJson());
        Map<String, Object> payload = new LinkedHashMap<>();
        Object defaults = providerConfig.get("request_defaults");
        if (defaults instanceof Map<?, ?> values) {
            values.forEach((key, value) -> payload.put(String.valueOf(key), value));
        }
        payload.put("model", providerConfig.getOrDefault(
            "model", StringUtils.hasText(requestedModel) ? requestedModel : "gpt-image-1"
        ));
        payload.put("prompt", prompt == null ? "" : prompt);
        payload.put("n", numberOption(options, "count", numberOption(options, "batchSize", 1)));
        String size = stringOption(options, "size");
        if (!StringUtils.hasText(size)) size = stringOption(options, "resolution");
        if (StringUtils.hasText(size)) payload.put("size", size);
        if (referenceUrls != null && !referenceUrls.isEmpty()) payload.put("reference_images", referenceUrls);
        Object providerParams = options == null ? null : options.get("providerParams");
        if (providerParams instanceof Map<?, ?> values) {
            values.forEach((key, value) -> payload.put(String.valueOf(key), value));
        }

        HttpRequest.Builder request = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 120_000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            request.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "图片 Provider 调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            if (asyncProviderJobClient.enabled(provider)) {
                return asyncProviderJobClient.acceptSubmission(provider, body);
            }
            List<String> urls = extractUrls(body);
            if (urls.isEmpty()) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "图片 Provider 未返回可识别的图片地址");
            }
            return Map.of(
                "assetUrl", urls.get(0),
                "assetUrls", urls,
                "count", urls.size(),
                "provider", provider.getProviderName(),
                "model", String.valueOf(payload.get("model"))
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "图片 Provider 调用被中断");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "图片 Provider 调用失败：" + exception.getMessage());
        }
    }

    private List<String> extractUrls(Map<String, Object> body) {
        List<String> urls = new ArrayList<>();
        collectUrls(body.get("data"), urls);
        collectUrls(body.get("output"), urls);
        collectUrls(body.get("urls"), urls);
        collectUrls(body.get("url"), urls);
        return urls;
    }

    private void collectUrls(Object value, List<String> urls) {
        if (value instanceof String text && StringUtils.hasText(text)) {
            urls.add(text);
        } else if (value instanceof List<?> list) {
            list.forEach(item -> collectUrls(item, urls));
        } else if (value instanceof Map<?, ?> map) {
            Object url = map.get("url");
            if (url != null) collectUrls(url, urls);
            Object imageUrl = map.get("image_url");
            if (imageUrl != null) collectUrls(imageUrl, urls);
            Object base64 = map.get("b64_json");
            if (base64 != null) urls.add("data:image/png;base64," + base64);
        }
    }

    private int numberOption(Map<String, Object> options, String key, int fallback) {
        Object value = options == null ? null : options.get(key);
        return value instanceof Number number ? Math.max(1, number.intValue()) : fallback;
    }

    private String stringOption(Map<String, Object> options, String key) {
        Object value = options == null ? null : options.get(key);
        return value == null ? null : String.valueOf(value);
    }
}
