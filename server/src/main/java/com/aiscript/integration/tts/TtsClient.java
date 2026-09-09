package com.aiscript.integration.tts;

import java.util.Map;

public interface TtsClient {
    String synthesize(String text, String voice);

    default String synthesize(String text, String voice, String model) {
        return synthesize(text, voice);
    }

    default Map<String, Object> synthesizeResult(String text, String voice, String model) {
        return Map.of("assetUrl", synthesize(text, voice, model));
    }
}
