package com.aiscript.integration.llm;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class OpenAiStreamResponseParserTest {
    @Test
    void parsesReasoningContentUsageAndLatencyFromSse() throws Exception {
        String stream = """
            : keep-alive

            data: {"choices":[{"delta":{"reasoning_content":"先分析"},"finish_reason":null}]}

            data: {"choices":[{"delta":{"content":"标题：测试"},"finish_reason":null}]}

            data: {"choices":[{"delta":{"content":"正文"},"finish_reason":"stop"}]}

            data: {"choices":[],"usage":{"prompt_tokens":120,"completion_tokens":45,"total_tokens":165,"completion_tokens_details":{"reasoning_tokens":20}}}

            data: [DONE]
            """;
        long startedAt = 1_000_000_000L;
        long[] times = {2_200_000_000L, 2_800_000_000L};
        AtomicInteger timeIndex = new AtomicInteger();

        OpenAiStreamResponseParser.ParsedStream parsed = OpenAiStreamResponseParser.parse(
            new BufferedReader(new StringReader(stream)),
            startedAt,
            () -> times[Math.min(timeIndex.getAndIncrement(), times.length - 1)]
        );

        assertEquals("标题：测试正文", parsed.content());
        assertEquals(1_200L, parsed.firstTokenLatencyMs());
        assertEquals(1_800L, parsed.firstContentLatencyMs());
        assertEquals(120L, parsed.promptTokens());
        assertEquals(45L, parsed.completionTokens());
        assertEquals(20L, parsed.reasoningTokens());
        assertEquals(165L, parsed.totalTokens());
        assertEquals("stop", parsed.finishReason());
    }
}
