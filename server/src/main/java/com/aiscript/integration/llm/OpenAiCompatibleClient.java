package com.aiscript.integration.llm;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import java.io.BufferedReader;
import java.io.InputStreamReader;
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

    @Override
    public LlmChatResult chatWithMetrics(String systemPrompt, String userPrompt) {
        return sendStreamingChat(systemPrompt, userPrompt);
    }

    private String sendChat(String systemPrompt, String userPrompt, List<String> imageUrls) {
        SysApiProviderConfig provider = requireProvider();
        Map<String, Object> config = JsonUtils.toMap(provider.getConfigJson());
        String model = String.valueOf(config.getOrDefault("model", "gpt-4o-mini"));
        Map<String, Object> payload = chatPayload(systemPrompt, userPrompt, imageUrls, config, model);
        HttpRequest.Builder builder = requestBuilder(provider)
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
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

    private Map<String, Object> chatPayload(
        String systemPrompt,
        String userPrompt,
        List<String> imageUrls,
        Map<String, Object> config,
        String model
    ) {
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
        return payload;
    }

    private SysApiProviderConfig requireProvider() {
        SysApiProviderConfig provider = providerConfigService.firstEnabled("llm");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException("未配置LLM Provider");
        }
        return provider;
    }

    private HttpRequest.Builder requestBuilder(SysApiProviderConfig provider) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(normalizeEndpointUrl(provider)))
            .timeout(Duration.ofMillis(Math.max(provider.getTimeoutMs() == null ? DEFAULT_LLM_TIMEOUT_MS : provider.getTimeoutMs(), DEFAULT_LLM_TIMEOUT_MS)))
            .header("Content-Type", "application/json");
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        return builder;
    }

    private LlmChatResult sendStreamingChat(String systemPrompt, String userPrompt) {
        SysApiProviderConfig provider = requireProvider();
        Map<String, Object> config = JsonUtils.toMap(provider.getConfigJson());
        String model = String.valueOf(config.getOrDefault("model", "gpt-4o-mini"));
        Map<String, Object> payload = chatPayload(systemPrompt, userPrompt, List.of(), config, model);
        payload.put("stream", true);
        payload.put("stream_options", Map.of("include_usage", true));
        HttpRequest request = requestBuilder(provider)
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)))
            .build();
        long startedAt = System.nanoTime();
        try {
            HttpResponse<java.io.InputStream> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofInputStream()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                try (java.io.InputStream ignored = response.body()) {
                    // 主动关闭错误响应流；响应正文可能包含供应商敏感信息，不写日志。
                }
                throw new BusinessException("LLM Provider调用失败：" + response.statusCode());
            }
            String contentType = response.headers().firstValue("Content-Type").orElse("");
            if (!contentType.toLowerCase(java.util.Locale.ROOT).contains("text/event-stream")) {
                String body;
                try (java.io.InputStream input = response.body()) {
                    body = new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }
                long totalLatencyMs = elapsedMs(startedAt);
                String content = extractContent(body);
                return new LlmChatResult(
                    content,
                    provider.getProviderName(),
                    provider.getPlatform(),
                    model,
                    characterCount(systemPrompt) + characterCount(userPrompt),
                    characterCount(content),
                    totalLatencyMs,
                    totalLatencyMs,
                    totalLatencyMs,
                    usageNumber(body, "prompt_tokens"),
                    usageNumber(body, "completion_tokens"),
                    reasoningTokenNumber(body),
                    usageNumber(body, "total_tokens"),
                    extractFinishReason(body),
                    false
                );
            }
            OpenAiStreamResponseParser.ParsedStream parsed;
            try (
                java.io.InputStream input = response.body();
                BufferedReader reader = new BufferedReader(new InputStreamReader(input, java.nio.charset.StandardCharsets.UTF_8))
            ) {
                parsed = OpenAiStreamResponseParser.parse(reader, startedAt, System::nanoTime);
            }
            long totalLatencyMs = elapsedMs(startedAt);
            return new LlmChatResult(
                parsed.content(),
                provider.getProviderName(),
                provider.getPlatform(),
                model,
                characterCount(systemPrompt) + characterCount(userPrompt),
                characterCount(parsed.content()),
                parsed.firstTokenLatencyMs(),
                parsed.firstContentLatencyMs(),
                totalLatencyMs,
                parsed.promptTokens(),
                parsed.completionTokens(),
                parsed.reasoningTokens(),
                parsed.totalTokens(),
                parsed.finishReason(),
                true
            );
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

    private long elapsedMs(long startedAt) {
        return Math.max(0, (System.nanoTime() - startedAt) / 1_000_000);
    }

    private long characterCount(String value) {
        return value == null ? 0 : value.codePointCount(0, value.length());
    }

    private Long usageNumber(String body, String field) {
        Object usageValue = JsonUtils.toMap(body).get("usage");
        if (usageValue instanceof Map<?, ?> usage && usage.get(field) instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private Long reasoningTokenNumber(String body) {
        Object usageValue = JsonUtils.toMap(body).get("usage");
        if (usageValue instanceof Map<?, ?> usage
            && usage.get("completion_tokens_details") instanceof Map<?, ?> details
            && details.get("reasoning_tokens") instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private String extractFinishReason(String body) {
        Object choicesValue = JsonUtils.toMap(body).get("choices");
        if (choicesValue instanceof List<?> choices && !choices.isEmpty()
            && choices.get(0) instanceof Map<?, ?> choice && choice.get("finish_reason") != null) {
            return String.valueOf(choice.get("finish_reason"));
        }
        return null;
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
