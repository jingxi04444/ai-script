package com.aiscript.integration.viral;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.config.MarketViralProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class PythonViralSearchClient implements ViralSearchClient {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private final MarketViralProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public PythonViralSearchClient(MarketViralProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    @Override
    public ViralSearchResult search(
        Integer tenantId,
        String category,
        Set<String> platforms
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("tenantId", tenantId);
        payload.put("category", category);
        payload.put("platforms", new ArrayList<>(platforms));
        JsonNode data = postSkill(properties.getSkillUrl(), payload);
        return parseResult(data);
    }

    @Override
    public CookieValidationResult validateCookie(Integer tenantId, String platform) {
        if (tenantId == null || !StringUtils.hasText(platform)) {
            return new CookieValidationResult(false, "缺少租户或平台参数");
        }
        JsonNode data = postSkill(validationUrl(), Map.of(
            "tenantId", tenantId,
            "platform", platform
        ));
        boolean valid = data.path("valid").asBoolean(false);
        return new CookieValidationResult(valid, text(data, "error"));
    }

    private JsonNode postSkill(String url, Map<String, Object> payload) {
        if (!properties.isEnabled()) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "品类爆款采集未启用");
        }
        if (!StringUtils.hasText(url)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "未配置品类爆款 Skill 地址");
        }
        if (!StringUtils.hasText(properties.getSkillToken())) {
            throw new BusinessException(
                ResultCode.PROVIDER_ERROR,
                "未配置 WORKFLOW_PROVIDER_GATEWAY_TOKEN，Java 与 Python 服务必须使用相同内部令牌"
            );
        }
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(Math.max(30, properties.getTimeoutSeconds())))
            .header("Content-Type", "application/json")
            .header("X-Workflow-Token", properties.getSkillToken())
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)))
            .build();
        try {
            HttpResponse<String> response = httpClient.send(
                request, HttpResponse.BodyHandlers.ofString()
            );
            JsonNode body = readBody(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException(
                    ResultCode.PROVIDER_ERROR,
                    "品类爆款 Skill 调用失败：" + errorMessage(body, response.statusCode())
                );
            }
            if (body.path("code").asInt(-1) != 0) {
                throw new BusinessException(
                    ResultCode.PROVIDER_ERROR,
                    "品类爆款 Skill 返回失败：" + errorMessage(body, response.statusCode())
                );
            }
            JsonNode data = body.path("data");
            if (!data.isObject()) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR, "品类爆款 Skill 返回数据格式不正确");
            }
            return data;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "品类爆款 Skill 调用被中断");
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(
                ResultCode.PROVIDER_ERROR,
                "品类爆款 Skill 服务不可用：" + concise(exception.getMessage())
            );
        }
    }

    private String validationUrl() {
        String executeUrl = properties.getSkillUrl();
        if (!StringUtils.hasText(executeUrl)) {
            return executeUrl;
        }
        return executeUrl.endsWith("/execute")
            ? executeUrl.substring(0, executeUrl.length() - "/execute".length()) + "/validate-cookie"
            : executeUrl;
    }

    ViralSearchResult parseResult(JsonNode data) {
        List<ViralSearchCandidate> candidates = new ArrayList<>();
        JsonNode items = data.path("candidates");
        if (items.isArray()) {
            for (JsonNode item : items) {
                ViralSearchCandidate candidate = toCandidate(item);
                if (candidate != null) {
                    candidates.add(candidate);
                }
            }
        }
        Map<String, Integer> rejectedReasons = new LinkedHashMap<>();
        JsonNode reasons = data.path("rejectedReasons");
        if (reasons.isObject()) {
            reasons.fields().forEachRemaining(entry ->
                rejectedReasons.put(entry.getKey(), entry.getValue().asInt())
            );
        }
        List<Map<String, String>> rejectedSamples = new ArrayList<>();
        JsonNode samples = data.path("rejectedSamples");
        if (samples.isArray()) {
            for (JsonNode sample : samples) {
                Map<String, String> item = new LinkedHashMap<>();
                item.put("platform", text(sample, "platform"));
                item.put("title", text(sample, "title"));
                item.put("reason", text(sample, "reason"));
                rejectedSamples.add(item);
            }
        }
        List<String> warnings = new ArrayList<>();
        JsonNode warningItems = data.path("warnings");
        if (warningItems.isArray()) {
            warningItems.forEach(item -> warnings.add(item.asText()));
        }
        return new ViralSearchResult(
            candidates,
            data.path("rawCandidateCount").asInt(),
            data.path("candidateCount").asInt(candidates.size()),
            data.path("filtered").asInt(),
            rejectedReasons,
            rejectedSamples,
            warnings
        );
    }

    ViralSearchCandidate toCandidate(JsonNode node) {
        String platform = text(node, "platform");
        String externalId = text(node, "externalId");
        String sourceUrl = text(node, "sourceUrl");
        if (!StringUtils.hasText(platform) || !StringUtils.hasText(externalId)
            || !StringUtils.hasText(sourceUrl)) {
            return null;
        }
        return new ViralSearchCandidate(
            platform,
            externalId,
            text(node, "category"),
            text(node, "title"),
            text(node, "authorName"),
            sourceUrl,
            text(node, "coverUrl"),
            text(node, "tags"),
            nullableInt(node, "durationSeconds"),
            node.path("likeCount").asLong(),
            node.path("commentCount").asLong(),
            node.path("collectCount").asLong(),
            node.path("shareCount").asLong(),
            parseDateTime(text(node, "publishedAt")),
            text(node, "discoveryQuery")
        );
    }

    private JsonNode readBody(String body) {
        try {
            return objectMapper.readTree(body == null || body.isBlank() ? "{}" : body);
        } catch (Exception exception) {
            return objectMapper.createObjectNode();
        }
    }

    private static String errorMessage(JsonNode body, int statusCode) {
        for (String key : List.of("message", "detail", "error")) {
            String value = body.path(key).asText("");
            if (StringUtils.hasText(value)) {
                return concise(value);
            }
        }
        return "HTTP " + statusCode;
    }

    private static String text(JsonNode node, String key) {
        JsonNode value = node.path(key);
        return value.isValueNode() && !value.isNull() ? value.asText() : "";
    }

    private static Integer nullableInt(JsonNode node, String key) {
        JsonNode value = node.path(key);
        return value.isNumber() ? value.asInt() : null;
    }

    private static LocalDateTime parseDateTime(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value).atZoneSameInstant(BUSINESS_ZONE).toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(value);
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    private static String concise(String value) {
        if (!StringUtils.hasText(value)) {
            return "未知错误";
        }
        String text = value.replaceAll("\\s+", " ").trim();
        return text.length() > 240 ? text.substring(0, 240) + "..." : text;
    }
}
