package com.aiscript.integration.tts;

public interface TtsClient {
    String synthesize(String text, String voice);
}
