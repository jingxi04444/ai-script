package com.aiscript.integration.provider;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** SiliconFlow video submit/status protocol. */
@Component
@Order(10)
public class SiliconFlowVideoPollingAdapter implements AsyncProviderPollingAdapter {
    private static final long DEFAULT_POLL_INTERVAL_MS = 5_000L;
    private static final long DEFAULT_MAX_WAIT_MS = 900_000L;
    private static final long RESULT_EXPIRES_IN_SECONDS = 3_600L;

    private final SecretCipherService secretCipherService;
    private final HttpTransport httpTransport;

    @Autowired
    public SiliconFlowVideoPollingAdapter(SecretCipherService secretCipherService) {
        this(secretCipherService, defaultTransport());
    }

    SiliconFlowVideoPollingAdapter(SecretCipherService secretCipherService, HttpTransport httpTransport) {
        this.secretCipherService = secretCipherService;
        this.httpTransport = httpTransport;
    }

    @Override
    public boolean supports(SysApiProviderConfig provider) {
        if (provider == null || !"video".equalsIgnoreCase(provider.getProviderType())) return false;
        String platform = normalize(provider.getPlatform());
        if (platform.equals("siliconflow") || platform.equals("siliconcloud")) return true;
        String endpoint = provider.getEndpointUrl();
        return StringUtils.hasText(endpoint)
            && endpoint.toLowerCase(Locale.ROOT).contains("api.siliconflow.cn/");
    }

    @Override
    public Map<String, Object> acceptSubmission(
        SysApiProviderConfig provider,
        Map<String, Object> response
    ) {
        String requestId = text(response.get("requestId"));
        if (!StringUtils.hasText(requestId)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "SiliconFlow 视频任务未返回 requestId");
        }
        Map<String, Object> output = pending(provider, requestId);
        output.put("providerAdapter", "siliconflow-video");
        return output;
    }

    @Override
    public Map<String, Object> poll(SysApiProviderConfig provider, String taskId) {
        if (!StringUtils.hasText(taskId)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "SiliconFlow requestId 不能为空");
        }
        HttpRequest.Builder request = HttpRequest.newBuilder()
            .uri(URI.create(statusUrl(provider)))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 30_000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(Map.of("requestId", taskId))));
        authorize(provider, request);

        try {
            TransportResponse response = httpTransport.send(request.build());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(
                    ResultCode.PROVIDER_ERROR,
                    "查询 SiliconFlow 视频任务失败：HTTP " + response.statusCode()
                );
            }
            return mapStatus(provider, taskId, JsonUtils.toMap(response.body()), response.traceId());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "查询 SiliconFlow 视频任务被中断");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(
                ResultCode.PROVIDER_ERROR,
                "查询 SiliconFlow 视频任务失败：" + exception.getMessage()
            );
        }
    }

    private Map<String, Object> mapStatus(
        SysApiProviderConfig provider,
        String taskId,
        Map<String, Object> body,
        String traceId
    ) {
        String status = text(body.get("status"));
        if ("Failed".equalsIgnoreCase(status)) {
            String reason = text(body.get("reason"));
            throw new BusinessException(
                ResultCode.PROVIDER_ERROR,
                "SiliconFlow 视频任务失败" + (StringUtils.hasText(reason) ? "：" + reason : "")
            );
        }
        if ("InQueue".equalsIgnoreCase(status) || "InProgress".equalsIgnoreCase(status)) {
            Map<String, Object> output = pending(provider, taskId);
            output.put("providerStatus", status);
            putIfPresent(output, "providerTraceId", traceId);
            return output;
        }
        if (!"Succeed".equalsIgnoreCase(status)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR,
                "SiliconFlow 返回未知视频任务状态：" + (StringUtils.hasText(status) ? status : "空"));
        }

        List<String> urls = videoUrls(body);
        if (urls.isEmpty()) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "SiliconFlow 视频任务完成但未返回视频地址");
        }
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("status", "success");
        output.put("taskId", taskId);
        output.put("assetUrl", urls.get(0));
        output.put("assetUrls", urls);
        output.put("provider", provider.getProviderName());
        output.put("providerAdapter", "siliconflow-video");
        output.put("providerStatus", status);
        output.put("temporaryAsset", true);
        output.put("resultExpiresInSeconds", RESULT_EXPIRES_IN_SECONDS);
        putIfPresent(output, "providerTraceId", traceId);
        return output;
    }

    private List<String> videoUrls(Map<String, Object> body) {
        Object results = body.get("results");
        if (!(results instanceof Map<?, ?> resultMap)) return List.of();
        Object videos = resultMap.get("videos");
        if (!(videos instanceof List<?> list)) return List.of();
        List<String> urls = new ArrayList<>();
        for (Object video : list) {
            if (video instanceof Map<?, ?> map) {
                String url = text(map.get("url"));
                if (StringUtils.hasText(url)) urls.add(url);
            }
        }
        return urls.stream().distinct().toList();
    }

    private Map<String, Object> pending(SysApiProviderConfig provider, String taskId) {
        Map<String, Object> asyncConfig = asyncConfig(provider);
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("status", "pending");
        output.put("taskId", taskId);
        output.put("providerId", String.valueOf(provider.getId()));
        output.put("provider", provider.getProviderName());
        output.put("pollIntervalMs", number(asyncConfig, "poll_interval_ms", DEFAULT_POLL_INTERVAL_MS));
        output.put("maxWaitMs", number(asyncConfig, "max_wait_ms", DEFAULT_MAX_WAIT_MS));
        output.put("providerAdapter", "siliconflow-video");
        return output;
    }

    private String statusUrl(SysApiProviderConfig provider) {
        Map<String, Object> asyncConfig = asyncConfig(provider);
        String override = text(asyncConfig.get("status_url"));
        if (!StringUtils.hasText(override)) override = text(asyncConfig.get("status_url_template"));
        if (StringUtils.hasText(override)) return override;

        String endpoint = provider.getEndpointUrl();
        if (!StringUtils.hasText(endpoint)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "SiliconFlow 未配置视频提交地址");
        }
        if (endpoint.endsWith("/video/submit")) {
            return endpoint.substring(0, endpoint.length() - "/submit".length()) + "/status";
        }
        if (endpoint.endsWith("/video/status")) return endpoint;
        throw new BusinessException(
            ResultCode.PROVIDER_ERROR,
            "无法从 SiliconFlow 提交地址推导状态接口，请配置 async_job.status_url"
        );
    }

    private void authorize(SysApiProviderConfig provider, HttpRequest.Builder request) {
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            request.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asyncConfig(SysApiProviderConfig provider) {
        Object value = JsonUtils.toMap(provider.getConfigJson()).get("async_job");
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    private long number(Map<String, Object> config, String key, long fallback) {
        Object value = config.get(key);
        return value instanceof Number number ? number.longValue() : fallback;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private void putIfPresent(Map<String, Object> output, String key, String value) {
        if (StringUtils.hasText(value)) output.put(key, value);
    }

    private static HttpTransport defaultTransport() {
        HttpClient httpClient = HttpClient.newHttpClient();
        return request -> {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return new TransportResponse(
                response.statusCode(),
                response.body(),
                response.headers().firstValue("x-siliconcloud-trace-id").orElse(null)
            );
        };
    }

    @FunctionalInterface
    interface HttpTransport {
        TransportResponse send(HttpRequest request) throws Exception;
    }

    record TransportResponse(int statusCode, String body, String traceId) {
    }
}
