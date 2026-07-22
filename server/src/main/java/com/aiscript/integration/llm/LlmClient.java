package com.aiscript.integration.llm;

public interface LlmClient {
    String chat(String systemPrompt, String userPrompt);
}
