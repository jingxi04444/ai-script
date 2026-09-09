package com.aiscript.integration.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.aiscript.modules.system.entity.SysApiProviderConfig;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;

class DefaultAsyncProviderJobClientTest {
    @Test
    void extractsTaskIdUsingDatabaseConfiguredJsonPath() {
        SysApiProviderConfig provider = new SysApiProviderConfig();
        provider.setId(9);
        provider.setProviderName("Async Video");
        provider.setConfigJson("""
            {"async_job":{"enabled":true,"task_id_path":"result.job.id","poll_interval_ms":1500}}
            """);
        DefaultAsyncProviderJobClient client = new DefaultAsyncProviderJobClient(null);

        Map<String, Object> output = client.acceptSubmission(provider, Map.of(
            "result", Map.of("job", Map.of("id", "task-123"))
        ));

        assertTrue(client.enabled(provider));
        assertEquals("task-123", output.get("taskId"));
        assertEquals("9", output.get("providerId"));
        assertEquals(1500L, output.get("pollIntervalMs"));
    }

    @Test
    void prefersDedicatedAdapterOverGenericConfiguration() {
        SysApiProviderConfig provider = new SysApiProviderConfig();
        provider.setId(12);
        provider.setProviderType("video");
        provider.setProviderName("Dedicated Video");
        provider.setConfigJson("{}");
        AsyncProviderPollingAdapter dedicated = new AsyncProviderPollingAdapter() {
            @Override
            public boolean supports(SysApiProviderConfig candidate) {
                return candidate == provider;
            }

            @Override
            public Map<String, Object> acceptSubmission(
                SysApiProviderConfig candidate,
                Map<String, Object> response
            ) {
                return Map.of("status", "pending", "taskId", "dedicated-task");
            }

            @Override
            public Map<String, Object> poll(SysApiProviderConfig candidate, String taskId) {
                return Map.of("status", "success", "assetUrl", "https://cdn.example/video.mp4");
            }
        };
        DefaultAsyncProviderJobClient client = new DefaultAsyncProviderJobClient(null, List.of(dedicated));

        assertTrue(client.enabled(provider));
        assertEquals("dedicated-task", client.acceptSubmission(provider, Map.of()).get("taskId"));
        assertEquals("success", client.poll(provider, "dedicated-task").get("status"));
    }
}
