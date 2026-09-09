package com.aiscript.integration.video;

import java.util.List;
import java.util.Map;

public interface VideoAssemblyClient {
    Map<String, Object> assemble(List<String> clipUrls, Map<String, Object> options);
}
