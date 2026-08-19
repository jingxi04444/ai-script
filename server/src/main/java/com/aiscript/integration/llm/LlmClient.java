package com.aiscript.integration.llm;

import java.util.List;

public interface LlmClient {
    String chat(String systemPrompt, String userPrompt);

    default LlmChatResult chatWithMetrics(String systemPrompt, String userPrompt) {
        long startedAt = System.nanoTime();
        String content = chat(systemPrompt, userPrompt);
        long totalLatencyMs = (System.nanoTime() - startedAt) / 1_000_000;
        return new LlmChatResult(
            content,
            null,
            null,
            null,
            characterCount(systemPrompt) + characterCount(userPrompt),
            characterCount(content),
            totalLatencyMs,
            totalLatencyMs,
            totalLatencyMs,
            null,
            null,
            null,
            null,
            null,
            false
        );
    }

    default String chatWithImages(String systemPrompt, String userPrompt, List<String> imageUrls) {
        return chat(systemPrompt, userPrompt);
    }

    private static long characterCount(String value) {
        return value == null ? 0 : value.codePointCount(0, value.length());
    }
}
