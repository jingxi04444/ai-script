package com.aiscript.integration.video;

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
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultVideoGenerationClient implements VideoGenerationClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient;
    private final AsyncProviderJobClient asyncProviderJobClient;

    public DefaultVideoGenerationClient(
        ProviderConfigService providerConfigService,
        SecretCipherService secretCipherService,
        AsyncProviderJobClient asyncProviderJobClient
    ) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.httpClient = HttpClient.newHttpClient();
        this.asyncProviderJobClient = asyncProviderJobClient;
    }

    @Override
    public String generateVideo(String prompt) {
        return generateVideo(prompt, null);
    }

    @Override
    public String generateVideo(String prompt, String model) {
        Map<String, Object> result = generateVideoResult(prompt, model);
        if ("pending".equals(result.get("status"))) {
            throw new BusinessException("视频 Provider 返回异步任务，请使用工作流异步接口");
        }
        return String.valueOf(result.get("assetUrl"));
    }

    @Override
    public Map<String, Object> generateVideoResult(String prompt, String model) {
        SysApiProviderConfig provider = providerConfigService.resolveEnabled("video", model);
        if (provider == null && StringUtils.hasText(model)) provider = providerConfigService.firstEnabled("video");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException("未配置视频生成Provider");
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 60000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload(prompt, model, provider))));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("视频生成Provider调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            if (asyncProviderJobClient.enabled(provider)) {
                return asyncProviderJobClient.acceptSubmission(provider, body);
            }
            Object data = body.get("data");
            if (data instanceof Map<?, ?> dataMap && dataMap.get("url") != null) {
                return Map.of("assetUrl", String.valueOf(dataMap.get("url")));
            }
            Object url = body.get("url");
            return Map.of("assetUrl", url == null ? response.body() : String.valueOf(url));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("视频生成Provider调用被中断");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("视频生成Provider调用失败：" + ex.getMessage());
        }
    }

    private Map<String, Object> payload(String prompt, String model, SysApiProviderConfig provider) {
        Map<String, Object> payload = new java.util.LinkedHashMap<>();
        Map<String, Object> config = JsonUtils.toMap(provider.getConfigJson());
        Object configuredModel = config.get("model");
        if (configuredModel != null) payload.put("model", configuredModel);
        else if (StringUtils.hasText(model)) payload.put("model", model);
        payload.put("prompt", prompt == null ? "" : prompt);
        return payload;
    }
}
