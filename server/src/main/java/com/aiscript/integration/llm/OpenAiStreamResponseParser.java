package com.aiscript.integration.llm;

import com.aiscript.common.util.JsonUtils;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;
import org.springframework.util.StringUtils;

final class OpenAiStreamResponseParser {
    private OpenAiStreamResponseParser() {
    }

    static ParsedStream parse(BufferedReader reader, long startedAtNanos, LongSupplier nanoTime) throws IOException {
        StringBuilder content = new StringBuilder();
        Long firstTokenLatencyMs = null;
        Long firstContentLatencyMs = null;
        Long promptTokens = null;
        Long completionTokens = null;
        Long reasoningTokens = null;
        Long totalTokens = null;
        String finishReason = null;
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.isBlank() || line.startsWith(":")) {
                continue;
            }
            if (!line.startsWith("data:")) {
                continue;
            }
            String data = line.substring("data:".length()).trim();
            if (data.isEmpty() || "[DONE]".equals(data)) {
                continue;
            }
            Map<String, Object> chunk = JsonUtils.toMap(data);
            Object usageValue = chunk.get("usage");
            if (usageValue instanceof Map<?, ?> usage) {
                promptTokens = number(usage.get("prompt_tokens"));
                completionTokens = number(usage.get("completion_tokens"));
                totalTokens = number(usage.get("total_tokens"));
                Object detailsValue = usage.get("completion_tokens_details");
                if (detailsValue instanceof Map<?, ?> details) {
                    reasoningTokens = number(details.get("reasoning_tokens"));
                }
            }
            Object choicesValue = chunk.get("choices");
            if (!(choicesValue instanceof List<?> choices) || choices.isEmpty()) {
                continue;
            }
            Object firstChoice = choices.get(0);
            if (!(firstChoice instanceof Map<?, ?> choice)) {
                continue;
            }
            if (choice.get("finish_reason") != null) {
                finishReason = String.valueOf(choice.get("finish_reason"));
            }
            Object deltaValue = choice.get("delta");
            if (!(deltaValue instanceof Map<?, ?> delta)) {
                continue;
            }
            String reasoningDelta = text(delta.get("reasoning_content"));
            String contentDelta = text(delta.get("content"));
            if (firstTokenLatencyMs == null && (StringUtils.hasText(reasoningDelta) || StringUtils.hasText(contentDelta))) {
                firstTokenLatencyMs = elapsedMs(startedAtNanos, nanoTime.getAsLong());
            }
            if (StringUtils.hasText(contentDelta) && firstContentLatencyMs == null) {
                firstContentLatencyMs = elapsedMs(startedAtNanos, nanoTime.getAsLong());
            }
            if (contentDelta != null) {
                content.append(contentDelta);
            }
        }
        return new ParsedStream(
            content.toString(),
            firstTokenLatencyMs,
            firstContentLatencyMs,
            promptTokens,
            completionTokens,
            reasoningTokens,
            totalTokens,
            finishReason
        );
    }

    private static long elapsedMs(long startedAtNanos, long nowNanos) {
        return Math.max(0, (nowNanos - startedAtNanos) / 1_000_000);
    }

    private static Long number(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static String text(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    record ParsedStream(
        String content,
        Long firstTokenLatencyMs,
        Long firstContentLatencyMs,
        Long promptTokens,
        Long completionTokens,
        Long reasoningTokens,
        Long totalTokens,
        String finishReason
    ) {
    }
}
