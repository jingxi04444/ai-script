package com.aiscript.modules.system.service;

import java.util.Map;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

public interface PromptRenderService {
    RenderedPrompt render(String sceneCode, String defaultSystemPrompt, String defaultUserPrompt, Map<String, String> variables);

    @Getter
    @RequiredArgsConstructor
    class RenderedPrompt {
        private final String systemPrompt;
        private final String userPrompt;
    }
}
