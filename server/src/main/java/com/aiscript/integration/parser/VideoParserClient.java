package com.aiscript.integration.parser;

import java.util.Map;

public interface VideoParserClient {
    Map<String, Object> parseShareUrl(String url);
}
