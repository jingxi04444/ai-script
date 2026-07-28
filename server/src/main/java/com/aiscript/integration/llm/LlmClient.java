package com.aiscript.integration.llm;

import java.util.List;

public interface LlmClient {
    String chat(String systemPrompt, String userPrompt);

    default String chatWithImages(String systemPrompt, String userPrompt, List<String> imageUrls) {
        return chat(systemPrompt, userPrompt);
    }
}
