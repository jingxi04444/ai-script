package com.aiscript.integration.llm;

/**
 * 一次 LLM 对话的内容与可观测指标。时间均使用单调时钟计算，单位为毫秒。
 */
public record LlmChatResult(
    String content,
    String provider,
    String platform,
    String model,
    long inputCharacters,
    long outputCharacters,
    Long firstTokenLatencyMs,
    Long firstContentLatencyMs,
    long totalLatencyMs,
    Long promptTokens,
    Long completionTokens,
    Long reasoningTokens,
    Long totalTokens,
    String finishReason,
    boolean streamed
) {
}
