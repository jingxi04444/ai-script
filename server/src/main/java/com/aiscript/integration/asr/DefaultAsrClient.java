package com.aiscript.integration.asr;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultAsrClient implements AsrClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient httpClient;

    public DefaultAsrClient(ProviderConfigService providerConfigService, SecretCipherService secretCipherService) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(30))
            .build();
    }

    @Override
    public String transcribe(String videoUrl) {
        if (!StringUtils.hasText(videoUrl)) {
            throw new BusinessException("视频地址不能为空");
        }
        SysApiProviderConfig provider = providerConfigService.firstEnabled("asr");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            throw new BusinessException("未配置ASR Provider，请传入 text 或先配置ASR服务");
        }
        if (provider.getEndpointUrl().contains("/audio/transcriptions")) {
            return transcribeByMultipartProvider(videoUrl, provider);
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 30000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(Map.of("videoUrl", videoUrl))));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("ASR Provider调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            Object data = body.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                Object text = dataMap.get("text");
                if (text == null) {
                    text = dataMap.get("transcript");
                }
                return text == null ? "" : String.valueOf(text);
            }
            Object text = body.get("text");
            if (text == null) {
                text = body.get("transcript");
            }
            if (text != null) {
                return String.valueOf(text);
            }
            return response.body();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("ASR Provider调用被中断");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("ASR Provider调用失败：" + ex.getMessage());
        }
    }

    private String transcribeByMultipartProvider(String videoUrl, SysApiProviderConfig provider) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("ai-script-asr-");
            Path videoFile = tempDir.resolve("input.mp4");
            Path audioFile = tempDir.resolve("audio.mp3");
            download(videoUrl, videoFile, provider.getTimeoutMs());
            extractAudio(videoFile, audioFile);
            String boundary = "----AiScriptBoundary" + UUID.randomUUID().toString().replace("-", "");
            byte[] body = multipartBody(boundary, audioFile);
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(provider.getEndpointUrl()))
                .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 120000 : provider.getTimeoutMs()))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body));
            if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
                builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
            }
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("ASR Provider调用失败：" + response.statusCode() + " " + response.body());
            }
            return extractText(response.body());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("ASR Provider调用被中断");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("ASR Provider调用失败：" + ex.getMessage());
        } finally {
            cleanup(tempDir);
        }
    }

    private void download(String videoUrl, Path target, Integer timeoutMs) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(videoUrl))
            .timeout(Duration.ofMillis(timeoutMs == null ? 120000 : timeoutMs))
            .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
            .header("Accept", "video/webm,video/mp4,video/*,*/*;q=0.8")
            .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
            .header("Referer", refererFor(videoUrl))
            .GET()
            .build();
        HttpResponse<Path> response = httpClient.send(request, HttpResponse.BodyHandlers.ofFile(target));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new BusinessException("视频下载失败：" + response.statusCode());
        }
        assertDownloadedVideo(target, response);
    }

    private void extractAudio(Path videoFile, Path audioFile) throws Exception {
        Process process = new ProcessBuilder("ffmpeg", "-y", "-i", videoFile.toString(), "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", audioFile.toString())
            .redirectErrorStream(true)
            .start();
        byte[] output = process.getInputStream().readAllBytes();
        if (!process.waitFor(120, java.util.concurrent.TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new BusinessException("ffmpeg 提取音频超时");
        }
        if (process.exitValue() != 0) {
            String message = new String(output, StandardCharsets.UTF_8);
            throw new BusinessException("ffmpeg 提取音频失败：" + abbreviate(message, 800));
        }
    }

    private void assertDownloadedVideo(Path target, HttpResponse<?> response) throws Exception {
        long size = Files.size(target);
        if (size <= 0) {
            throw new BusinessException("视频下载失败：文件为空");
        }
        String contentType = response.headers().firstValue("content-type").orElse("").toLowerCase();
        if (contentType.contains("text/html") || looksLikeHtml(target)) {
            throw new BusinessException("视频下载失败：平台返回了HTML页面而不是真实视频文件，请检查解析出的视频直链是否有效或是否需要防盗链参数");
        }
    }

    private boolean looksLikeHtml(Path target) throws Exception {
        byte[] bytes = Files.readAllBytes(target);
        String prefix = new String(bytes, 0, Math.min(bytes.length, 256), StandardCharsets.UTF_8).trim().toLowerCase();
        return prefix.startsWith("<!doctype html") || prefix.startsWith("<html") || prefix.contains("<body");
    }

    private String refererFor(String videoUrl) {
        String lower = videoUrl == null ? "" : videoUrl.toLowerCase();
        if (lower.contains("douyin") || lower.contains("snssdk") || lower.contains("byte")) {
            return "https://www.douyin.com/";
        }
        if (lower.contains("kuaishou")) {
            return "https://v.kuaishou.com/";
        }
        if (lower.contains("bilibili") || lower.contains("bilivideo")) {
            return "https://www.bilibili.com/";
        }
        if (lower.contains("xiaohongshu") || lower.contains("xhscdn")) {
            return "https://www.xiaohongshu.com/";
        }
        return "https://www.douyin.com/";
    }

    private String abbreviate(String value, int maxLength) {
        if (!StringUtils.hasText(value)) {
            return "未知错误";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength) + "...";
    }

    private byte[] multipartBody(String boundary, Path audioFile) throws Exception {
        String prefix = "--" + boundary + "\r\n"
            + "Content-Disposition: form-data; name=\"model\"\r\n\r\n"
            + "FunAudioLLM/SenseVoiceSmall\r\n"
            + "--" + boundary + "\r\n"
            + "Content-Disposition: form-data; name=\"file\"; filename=\"audio.mp3\"\r\n"
            + "Content-Type: audio/mpeg\r\n\r\n";
        String suffix = "\r\n--" + boundary + "--\r\n";
        byte[] fileBytes = Files.readAllBytes(audioFile);
        byte[] prefixBytes = prefix.getBytes(StandardCharsets.UTF_8);
        byte[] suffixBytes = suffix.getBytes(StandardCharsets.UTF_8);
        byte[] body = new byte[prefixBytes.length + fileBytes.length + suffixBytes.length];
        System.arraycopy(prefixBytes, 0, body, 0, prefixBytes.length);
        System.arraycopy(fileBytes, 0, body, prefixBytes.length, fileBytes.length);
        System.arraycopy(suffixBytes, 0, body, prefixBytes.length + fileBytes.length, suffixBytes.length);
        return body;
    }

    private String extractText(String responseBody) {
        Map<String, Object> body = JsonUtils.toMap(responseBody);
        Object text = body.get("text");
        if (text == null) {
            text = body.get("transcript");
        }
        Object data = body.get("data");
        if (text == null && data instanceof Map<?, ?> dataMap) {
            text = dataMap.get("text");
            if (text == null) {
                text = dataMap.get("transcript");
            }
        }
        return text == null ? responseBody : String.valueOf(text);
    }

    private void cleanup(Path tempDir) {
        if (tempDir == null) return;
        try (var paths = Files.walk(tempDir)) {
            paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (Exception ignored) {
                }
            });
        } catch (Exception ignored) {
        }
    }
}
