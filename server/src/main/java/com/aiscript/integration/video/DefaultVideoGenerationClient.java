package com.aiscript.integration.video;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
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

    public DefaultVideoGenerationClient(ProviderConfigService providerConfigService, SecretCipherService secretCipherService) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    public String generateVideo(String prompt) {
        SysApiProviderConfig provider = providerConfigService.firstEnabled("video");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException("未配置视频生成Provider");
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 60000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(Map.of("prompt", prompt == null ? "" : prompt))));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("视频生成Provider调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            Object data = body.get("data");
            if (data instanceof Map<?, ?> dataMap && dataMap.get("url") != null) {
                return String.valueOf(dataMap.get("url"));
            }
            Object url = body.get("url");
            return url == null ? response.body() : String.valueOf(url);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("视频生成Provider调用被中断");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("视频生成Provider调用失败：" + ex.getMessage());
        }
    }
}
