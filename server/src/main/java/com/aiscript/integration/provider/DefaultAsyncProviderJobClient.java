package com.aiscript.integration.provider;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultAsyncProviderJobClient implements AsyncProviderJobClient {
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final List<AsyncProviderPollingAdapter> pollingAdapters;

    @Autowired
    public DefaultAsyncProviderJobClient(
        SecretCipherService secretCipherService,
        List<AsyncProviderPollingAdapter> pollingAdapters
    ) {
        this.secretCipherService = secretCipherService;
        this.pollingAdapters = pollingAdapters == null ? List.of() : List.copyOf(pollingAdapters);
    }

    DefaultAsyncProviderJobClient(SecretCipherService secretCipherService) {
        this(secretCipherService, List.of());
    }

    @Override
    public boolean enabled(SysApiProviderConfig provider) {
        return adapter(provider).isPresent() || Boolean.TRUE.equals(asyncConfig(provider).get("enabled"));
    }

    @Override
    public Map<String, Object> acceptSubmission(SysApiProviderConfig provider, Map<String, Object> response) {
        Optional<AsyncProviderPollingAdapter> adapter = adapter(provider);
        if (adapter.isPresent()) return adapter.get().acceptSubmission(provider, response);
        Map<String, Object> config = asyncConfig(provider);
        String taskId = firstText(response, paths(config, "task_id_paths", List.of(
            text(config, "task_id_path", "data.task_id"), "task_id", "id"
        )));
        if (!StringUtils.hasText(taskId)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "异步 Provider 未返回任务 ID");
        }
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("status", "pending");
        output.put("taskId", taskId);
        output.put("providerId", String.valueOf(provider.getId()));
        output.put("provider", provider.getProviderName());
        output.put("pollIntervalMs", number(config, "poll_interval_ms", 3000));
        output.put("maxWaitMs", number(config, "max_wait_ms", 900_000));
        return output;
    }

    @Override
    public Map<String, Object> poll(SysApiProviderConfig provider, String taskId) {
        Optional<AsyncProviderPollingAdapter> adapter = adapter(provider);
        if (adapter.isPresent()) return adapter.get().poll(provider, taskId);
        Map<String, Object> config = asyncConfig(provider);
        String template = text(config, "status_url_template", null);
        if (!StringUtils.hasText(template)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "异步 Provider 未配置 status_url_template");
        }
        String encodedTaskId = URLEncoder.encode(taskId, StandardCharsets.UTF_8);
        String url = template.replace("{taskId}", encodedTaskId).replace("{task_id}", encodedTaskId);
        String method = text(config, "status_method", "GET").toUpperCase(Locale.ROOT);
        HttpRequest.Builder request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 30_000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json");
        authorize(provider, request);
        if ("POST".equals(method)) {
            Map<String, Object> payload = new LinkedHashMap<>();
            Object defaults = config.get("status_request_defaults");
            if (defaults instanceof Map<?, ?> values) {
                values.forEach((key, value) -> payload.put(String.valueOf(key), value));
            }
            payload.put(text(config, "status_task_id_field", "task_id"), taskId);
            request.POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
        } else {
            request.GET();
        }
        try {
            HttpResponse<String> response = httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "查询异步 Provider 任务失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            String status = firstText(body, paths(config, "status_paths", List.of(
                text(config, "status_path", "data.status"), "status"
            )));
            List<String> resultPaths = paths(config, "result_url_paths", List.of(
                "data.url", "data.output.url", "data.video_url", "data.audio_url", "url"
            ));
            List<String> urls = collectTexts(body, resultPaths);
            if (matches(status, values(config, "failure_values", List.of("failed", "error", "canceled")))) {
                String error = firstText(body, paths(config, "error_paths", List.of("data.error", "error", "message")));
                throw new BusinessException(ResultCode.PROVIDER_ERROR,
                    "异步 Provider 任务失败" + (StringUtils.hasText(error) ? "：" + error : ""));
            }
            boolean success = matches(status, values(config, "success_values", List.of(
                "success", "succeeded", "completed", "done"
            )));
            if (!success && urls.isEmpty()) {
                return Map.of(
                    "status", "pending",
                    "taskId", taskId,
                    "providerId", String.valueOf(provider.getId()),
                    "pollIntervalMs", number(config, "poll_interval_ms", 3000),
                    "maxWaitMs", number(config, "max_wait_ms", 900_000)
                );
            }
            if (urls.isEmpty()) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "异步 Provider 已完成但未返回素材地址");
            }
            return Map.of(
                "status", "success",
                "taskId", taskId,
                "assetUrl", urls.get(0),
                "assetUrls", urls,
                "provider", provider.getProviderName()
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "查询异步 Provider 任务被中断");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "查询异步 Provider 任务失败：" + exception.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asyncConfig(SysApiProviderConfig provider) {
        Object value = JsonUtils.toMap(provider.getConfigJson()).get("async_job");
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }

    private Optional<AsyncProviderPollingAdapter> adapter(SysApiProviderConfig provider) {
        return pollingAdapters.stream().filter(candidate -> candidate.supports(provider)).findFirst();
    }

    private void authorize(SysApiProviderConfig provider, HttpRequest.Builder request) {
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            request.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
    }

    private Object atPath(Object root, String path) {
        Object current = root;
        for (String token : path.split("\\.")) {
            if (current instanceof Map<?, ?> map) current = map.get(token);
            else if (current instanceof List<?> list && token.matches("\\d+")) {
                int index = Integer.parseInt(token);
                current = index < list.size() ? list.get(index) : null;
            } else return null;
            if (current == null) return null;
        }
        return current;
    }

    private String firstText(Map<String, Object> root, List<String> paths) {
        return collectTexts(root, paths).stream().findFirst().orElse(null);
    }

    private List<String> collectTexts(Map<String, Object> root, List<String> paths) {
        List<String> results = new ArrayList<>();
        for (String path : paths) collect(atPath(root, path), results);
        return results.stream().distinct().toList();
    }

    private void collect(Object value, List<String> results) {
        if (value instanceof String text && StringUtils.hasText(text)) results.add(text);
        else if (value instanceof List<?> list) list.forEach(item -> collect(item, results));
        else if (value instanceof Map<?, ?> map) {
            if (map.get("url") != null) collect(map.get("url"), results);
            if (map.get("video_url") != null) collect(map.get("video_url"), results);
            if (map.get("audio_url") != null) collect(map.get("audio_url"), results);
        }
    }

    private boolean matches(String status, List<String> values) {
        return StringUtils.hasText(status) && values.stream().anyMatch(value -> value.equalsIgnoreCase(status));
    }

    private List<String> paths(Map<String, Object> config, String key, List<String> fallback) {
        Object value = config.get(key);
        if (value instanceof List<?> list) {
            List<String> result = list.stream().filter(item -> item != null)
                .map(String::valueOf).filter(StringUtils::hasText).toList();
            if (!result.isEmpty()) return result;
        }
        return fallback.stream().filter(StringUtils::hasText).toList();
    }

    private List<String> values(Map<String, Object> config, String key, List<String> fallback) {
        return paths(config, key, fallback);
    }

    private String text(Map<String, Object> config, String key, String fallback) {
        Object value = config.get(key);
        return value == null ? fallback : String.valueOf(value);
    }

    private long number(Map<String, Object> config, String key, long fallback) {
        Object value = config.get(key);
        return value instanceof Number number ? number.longValue() : fallback;
    }
}
