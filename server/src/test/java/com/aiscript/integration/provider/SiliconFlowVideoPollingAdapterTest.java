package com.aiscript.integration.provider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.framework.secret.SecretProperties;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import java.net.http.HttpRequest;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class SiliconFlowVideoPollingAdapterTest {
    @Test
    void springSelectsTheProductionConstructor() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.registerBean(SecretProperties.class, SecretProperties::new);
            context.registerBean(SecretCipherService.class);
            context.registerBean(SiliconFlowVideoPollingAdapter.class);
            context.refresh();

            assertTrue(context.getBean(SiliconFlowVideoPollingAdapter.class) != null);
        }
    }

    @Test
    void mapsSiliconFlowSubmissionAndSuccessfulStatus() {
        AtomicReference<HttpRequest> sentRequest = new AtomicReference<>();
        SiliconFlowVideoPollingAdapter adapter = adapter(request -> {
            sentRequest.set(request);
            return response(
                "{\"status\":\"Succeed\",\"results\":{\"videos\":[{\"url\":\"https://cdn.example/result.mp4\"}]}}"
            );
        });
        SysApiProviderConfig provider = provider();

        Map<String, Object> submitted = adapter.acceptSubmission(provider, Map.of("requestId", "req-123"));
        Map<String, Object> completed = adapter.poll(provider, "req-123");

        assertTrue(adapter.supports(provider));
        assertEquals("pending", submitted.get("status"));
        assertEquals("req-123", submitted.get("taskId"));
        assertEquals("success", completed.get("status"));
        assertEquals("https://cdn.example/result.mp4", completed.get("assetUrl"));
        assertEquals(true, completed.get("temporaryAsset"));
        assertEquals(3600L, completed.get("resultExpiresInSeconds"));
        assertEquals("trace-123", completed.get("providerTraceId"));

        HttpRequest request = sentRequest.get();
        assertEquals("POST", request.method());
        assertEquals("https://api.siliconflow.cn/v1/video/status", request.uri().toString());
        assertEquals("Bearer test-api-key", request.headers().firstValue("Authorization").orElseThrow());
        assertTrue(request.bodyPublisher().isPresent());
    }

    @Test
    void keepsInProgressTaskPending() {
        SiliconFlowVideoPollingAdapter adapter = adapter(
            request -> response("{\"status\":\"InProgress\"}")
        );

        Map<String, Object> output = adapter.poll(provider(), "req-progress");

        assertEquals("pending", output.get("status"));
        assertEquals("InProgress", output.get("providerStatus"));
        assertEquals(5000L, output.get("pollIntervalMs"));
    }

    @Test
    void exposesProviderFailureReason() {
        SiliconFlowVideoPollingAdapter adapter = adapter(
            request -> response("{\"status\":\"Failed\",\"reason\":\"content policy\"}")
        );

        BusinessException exception = assertThrows(
            BusinessException.class,
            () -> adapter.poll(provider(), "req-failed")
        );

        assertTrue(exception.getMessage().contains("content policy"));
    }

    private SiliconFlowVideoPollingAdapter adapter(SiliconFlowVideoPollingAdapter.HttpTransport transport) {
        SecretProperties properties = new SecretProperties();
        properties.setCipherKey("test-cipher-key");
        return new SiliconFlowVideoPollingAdapter(new SecretCipherService(properties), transport);
    }

    private SysApiProviderConfig provider() {
        SysApiProviderConfig provider = new SysApiProviderConfig();
        provider.setId(18);
        provider.setProviderType("video");
        provider.setProviderName("SiliconFlow Video");
        provider.setPlatform("SiliconFlow");
        provider.setEndpointUrl("https://api.siliconflow.cn/v1/video/submit");
        provider.setApiKeyEncrypted("test-api-key");
        provider.setConfigJson("{\"model\":\"Wan-AI/Wan2.2-T2V-A14B\"}");
        return provider;
    }

    private SiliconFlowVideoPollingAdapter.TransportResponse response(String body) {
        return new SiliconFlowVideoPollingAdapter.TransportResponse(200, body, "trace-123");
    }
}
