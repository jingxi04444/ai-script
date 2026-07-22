package com.aiscript.integration.llm;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class OpenAiCompatibleClient implements LlmClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient;

    public OpenAiCompatibleClient(ProviderConfigService providerConfigService, SecretCipherService secretCipherService) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) {
        SysApiProviderConfig provider = providerConfigService.firstEnabled("llm");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException("未配置LLM Provider");
        }
        Map<String, Object> config = JsonUtils.toMap(provider.getConfigJson());
        String model = String.valueOf(config.getOrDefault("model", "gpt-4o-mini"));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt == null ? "" : systemPrompt),
                Map.of("role", "user", "content", userPrompt == null ? "" : userPrompt)
        ));
        Object thinking = normalizeThinking(config.get("thinking"));
        if (thinking != null) {
            payload.put("thinking", thinking);
        }
        Object reasoningEffort = config.get("reasoning_effort");
        if (reasoningEffort != null && StringUtils.hasText(String.valueOf(reasoningEffort))) {
            payload.put("reasoning_effort", reasoningEffort);
        }
//        if (!isThinkingEnabled(thinking)) {
//            payload.put("temperature", config.getOrDefault("temperature", 0.7));
//        }
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(normalizeEndpointUrl(provider)))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 8000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("LLM Provider调用失败：" + response.statusCode());
            }
            return extractContent(response.body());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("LLM Provider调用被中断");
        } catch (Exception ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("LLM Provider调用失败：" + ex.getMessage());
        }
    }

    private String normalizeEndpointUrl(SysApiProviderConfig provider) {
        String endpointUrl = provider.getEndpointUrl().trim();
        if ("deepseek".equalsIgnoreCase(provider.getPlatform()) && endpointUrl.matches("(?i).*/chat/completion/?$")) {
            return endpointUrl.replaceFirst("(?i)/chat/completion/?$", "/chat/completions");
        }
        return endpointUrl;
    }

    private Object normalizeThinking(Object value) {
        if (value instanceof Map<?, ?>) {
            return value;
        }
        if (value instanceof Boolean enabled) {
            return Map.of("type", enabled ? "enabled" : "disabled");
        }
        if (value != null && StringUtils.hasText(String.valueOf(value))) {
            return Map.of("type", String.valueOf(value));
        }
        return null;
    }

    private boolean isThinkingEnabled(Object thinking) {
        if (!(thinking instanceof Map<?, ?> thinkingMap)) {
            return false;
        }
        return "enabled".equalsIgnoreCase(String.valueOf(thinkingMap.get("type")));
    }

    @SuppressWarnings("unchecked")
    private String extractContent(String body) {
        Map<String, Object> map = JsonUtils.toMap(body);
        Object choicesValue = map.get("choices");
        if (choicesValue instanceof List<?> choices && !choices.isEmpty()) {
            Object first = choices.get(0);
            if (first instanceof Map<?, ?> firstMap) {
                Object message = firstMap.get("message");
                if (message instanceof Map<?, ?> messageMap) {
                    Object content = messageMap.get("content");
                    return content == null ? "" : String.valueOf(content);
                }
                Object text = firstMap.get("text");
                return text == null ? "" : String.valueOf(text);
            }
        }
        return body;
    }
}
