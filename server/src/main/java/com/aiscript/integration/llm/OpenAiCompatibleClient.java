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
    private static final int DEFAULT_LLM_TIMEOUT_MS = 180_000;
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
        return sendChat(systemPrompt, userPrompt, List.of());
    }

    @Override
    public String chatWithImages(String systemPrompt, String userPrompt, List<String> imageUrls) {
        return sendChat(systemPrompt, userPrompt, imageUrls == null ? List.of() : imageUrls);
    }

    private String sendChat(String systemPrompt, String userPrompt, List<String> imageUrls) {
        SysApiProviderConfig provider = providerConfigService.firstEnabled("llm");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException("未配置LLM Provider");
        }
        Map<String, Object> config = JsonUtils.toMap(provider.getConfigJson());
        String model = String.valueOf(config.getOrDefault("model", "gpt-4o-mini"));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        Object userContent = userPrompt == null ? "" : userPrompt;
        if (!imageUrls.isEmpty()) {
            List<Map<String, Object>> contentParts = new java.util.ArrayList<>();
            contentParts.add(Map.of("type", "text", "text", userContent));
            imageUrls.stream()
                .filter(StringUtils::hasText)
                .forEach(url -> contentParts.add(Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", url)
                )));
            userContent = contentParts;
        }
        payload.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt == null ? "" : systemPrompt),
            Map.of("role", "user", "content", userContent)
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
            .timeout(Duration.ofMillis(Math.max(provider.getTimeoutMs() == null ? DEFAULT_LLM_TIMEOUT_MS : provider.getTimeoutMs(), DEFAULT_LLM_TIMEOUT_MS)))
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
