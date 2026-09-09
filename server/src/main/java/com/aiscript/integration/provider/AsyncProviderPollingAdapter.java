package com.aiscript.integration.provider;

import com.aiscript.modules.system.entity.SysApiProviderConfig;
import java.util.Map;

/**
 * Provider-specific asynchronous task protocol.
 *
 * <p>Implementations own the provider's exact task id, status and result mapping. The generic
 * JSON-path implementation remains the fallback for providers without a dedicated adapter.</p>
 */
public interface AsyncProviderPollingAdapter {
    boolean supports(SysApiProviderConfig provider);

    Map<String, Object> acceptSubmission(SysApiProviderConfig provider, Map<String, Object> response);

    Map<String, Object> poll(SysApiProviderConfig provider, String taskId);
}
