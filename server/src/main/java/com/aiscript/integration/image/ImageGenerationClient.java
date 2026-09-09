package com.aiscript.integration.image;

import java.util.List;
import java.util.Map;

public interface ImageGenerationClient {
    Map<String, Object> generate(String prompt, List<String> referenceUrls, Map<String, Object> options);
}
