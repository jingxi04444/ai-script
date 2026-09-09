package com.aiscript.integration.video;

import java.util.Map;

public interface VideoGenerationClient {
    String generateVideo(String prompt);

    default String generateVideo(String prompt, String model) {
        return generateVideo(prompt);
    }

    default Map<String, Object> generateVideoResult(String prompt, String model) {
        return Map.of("assetUrl", generateVideo(prompt, model));
    }
}
