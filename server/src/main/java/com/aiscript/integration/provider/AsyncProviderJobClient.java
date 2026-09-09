package com.aiscript.integration.provider;

import com.aiscript.modules.system.entity.SysApiProviderConfig;
import java.util.Map;

public interface AsyncProviderJobClient {
    boolean enabled(SysApiProviderConfig provider);

    Map<String, Object> acceptSubmission(SysApiProviderConfig provider, Map<String, Object> response);

    Map<String, Object> poll(SysApiProviderConfig provider, String taskId);
}
