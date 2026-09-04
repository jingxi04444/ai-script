package com.aiscript.integration.parser;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class DefaultVideoParserClientTest {
    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void normalizesCommonProviderFieldsAndMarksDirectVideo() throws Exception {
        DefaultVideoParserClient client = clientWithProviderResponse("""
            {"code":0,"data":{"video_url":"https://cdn.example.com/video.mp4","desc":"测试视频文案","parseMode":"url_only"}}
            """);

        Map<String, Object> result = client.parseShareUrl("https://v.douyin.com/example/");

        assertEquals("https://cdn.example.com/video.mp4", result.get("videoUrl"));
        assertEquals("测试视频文案", result.get("copy"));
        assertEquals("real_video", result.get("parseMode"));
    }

    @Test
    void rejectsProviderPlaceholderWithoutVideoOrCopy() throws Exception {
        DefaultVideoParserClient client = clientWithProviderResponse("""
            {"code":0,"data":{"title":"外部视频链接","parseMode":"url_only"}}
            """);

        BusinessException exception = assertThrows(
            BusinessException.class,
            () -> client.parseShareUrl("https://v.douyin.com/example/")
        );

        assertTrue(exception.getMessage().contains("未返回可识别的视频地址或文案"));
        assertEquals(ResultCode.PROVIDER_ERROR, exception.getResultCode());
    }

    @Test
    void acceptsDirectMediaUrlWithoutProvider() {
        ProviderConfigService providerConfigService = mock(ProviderConfigService.class);
        when(providerConfigService.firstEnabled("video_parse")).thenReturn(null);
        DefaultVideoParserClient client = new DefaultVideoParserClient(
            providerConfigService,
            mock(SecretCipherService.class),
            mock(DouyinBrowserMediaResolver.class)
        );

        Map<String, Object> result = client.parseShareUrl("https://cdn.example.com/video.mp4");

        assertEquals("real_video", result.get("parseMode"));
        assertEquals("https://cdn.example.com/video.mp4", result.get("videoUrl"));
    }

    private DefaultVideoParserClient clientWithProviderResponse(String responseBody) throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/parse", exchange -> {
            exchange.getRequestBody().readAllBytes();
            byte[] body = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        SysApiProviderConfig provider = new SysApiProviderConfig();
        provider.setEndpointUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/parse");
        provider.setTimeoutMs(3000);
        ProviderConfigService providerConfigService = mock(ProviderConfigService.class);
        when(providerConfigService.firstEnabled("video_parse")).thenReturn(provider);
        return new DefaultVideoParserClient(
            providerConfigService,
            mock(SecretCipherService.class),
            mock(DouyinBrowserMediaResolver.class)
        );
    }
}
