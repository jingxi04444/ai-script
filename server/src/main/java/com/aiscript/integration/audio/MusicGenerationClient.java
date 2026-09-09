package com.aiscript.integration.audio;

import java.util.Map;

public interface MusicGenerationClient {
    Map<String, Object> generate(String prompt, Map<String, Object> options);
}
