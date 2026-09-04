package com.aiscript.integration.parser;

import com.aiscript.common.util.JsonUtils;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class DouyinBrowserMediaResolver {
    private static final Duration START_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration MEDIA_TIMEOUT = Duration.ofSeconds(25);
    private static final Semaphore BROWSER_SLOT = new Semaphore(1);
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(2))
        .build();

    public Optional<BrowserMedia> resolve(String canonicalUrl) {
        Optional<String> browserExecutable = browserExecutable();
        if (browserExecutable.isEmpty()) {
            log.warn("未找到 Chrome/Chromium，跳过抖音浏览器媒体解析");
            return Optional.empty();
        }
        boolean acquired = false;
        try {
            acquired = BROWSER_SLOT.tryAcquire(30, TimeUnit.SECONDS);
            if (!acquired) {
                log.warn("抖音浏览器媒体解析繁忙，url={}", canonicalUrl);
                return Optional.empty();
            }
            return resolveWithBrowser(browserExecutable.get(), canonicalUrl);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception exception) {
            log.warn("抖音浏览器媒体解析失败，url={}, reason={}", canonicalUrl, exception.getMessage());
            return Optional.empty();
        } finally {
            if (acquired) {
                BROWSER_SLOT.release();
            }
        }
    }

    private Optional<BrowserMedia> resolveWithBrowser(String executable, String canonicalUrl) throws Exception {
        int port = availablePort();
        Path profileDir = Files.createTempDirectory("ai-script-douyin-browser-");
        Path browserLog = profileDir.resolve("chrome.log");
        Process process = new ProcessBuilder(
            executable,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--mute-audio",
            "--autoplay-policy=no-user-gesture-required",
            "--remote-allow-origins=*",
            "--remote-debugging-port=" + port,
            "--user-data-dir=" + profileDir,
            "about:blank"
        ).redirectErrorStream(true).redirectOutput(browserLog.toFile()).start();

        WebSocket webSocket = null;
        try {
            waitForDevTools(port, process);
            String debuggerUrl = createPage(port);
            CdpListener listener = new CdpListener();
            webSocket = httpClient.newWebSocketBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .buildAsync(URI.create(debuggerUrl), listener)
                .get(5, TimeUnit.SECONDS);
            AtomicInteger commandId = new AtomicInteger();
            sendCommand(webSocket, commandId.incrementAndGet(), "Network.enable", Map.of());
            sendCommand(webSocket, commandId.incrementAndGet(), "Page.enable", Map.of());
            sendCommand(webSocket, commandId.incrementAndGet(), "Page.navigate", Map.of("url", canonicalUrl));

            String mediaUrl = waitForMediaUrl(listener.messages(), MEDIA_TIMEOUT);
            if (!StringUtils.hasText(mediaUrl)) {
                return Optional.empty();
            }
            PageMetadata metadata = readPageMetadata(webSocket, listener.messages(), commandId.incrementAndGet());
            return Optional.of(new BrowserMedia(mediaUrl, metadata.title(), metadata.coverUrl()));
        } finally {
            if (webSocket != null) {
                webSocket.sendClose(WebSocket.NORMAL_CLOSURE, "done");
            }
            stopProcess(process);
            deleteRecursively(profileDir);
        }
    }

    private void waitForDevTools(int port, Process process) throws Exception {
        long deadline = System.nanoTime() + START_TIMEOUT.toNanos();
        URI endpoint = URI.create("http://127.0.0.1:" + port + "/json/version");
        while (System.nanoTime() < deadline) {
            if (!process.isAlive()) {
                throw new IOException("Chrome/Chromium 启动失败");
            }
            try {
                HttpResponse<String> response = httpClient.send(
                    HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(1)).GET().build(),
                    HttpResponse.BodyHandlers.ofString()
                );
                if (response.statusCode() == 200) {
                    return;
                }
            } catch (IOException ignored) {
            }
            Thread.sleep(200);
        }
        throw new IOException("Chrome/Chromium DevTools 启动超时");
    }

    private String createPage(int port) throws Exception {
        HttpResponse<String> response = httpClient.send(
            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/json/new?about:blank"))
                .timeout(Duration.ofSeconds(3))
                .PUT(HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString()
        );
        String debuggerUrl = stringValue(JsonUtils.toMap(response.body()).get("webSocketDebuggerUrl"));
        if (response.statusCode() != 200 || !StringUtils.hasText(debuggerUrl)) {
            throw new IOException("未能创建 Chrome/Chromium 调试页面");
        }
        return debuggerUrl;
    }

    private String waitForMediaUrl(BlockingQueue<String> messages, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        long fallbackDeadline = Long.MAX_VALUE;
        String fallbackMediaUrl = "";
        while (System.nanoTime() < deadline) {
            if (StringUtils.hasText(fallbackMediaUrl) && System.nanoTime() >= fallbackDeadline) {
                return fallbackMediaUrl;
            }
            long remainingMillis = Math.max(1, TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime()));
            String message = messages.poll(Math.min(remainingMillis, 1000), TimeUnit.MILLISECONDS);
            if (!StringUtils.hasText(message)) {
                continue;
            }
            Map<String, Object> event = JsonUtils.toMap(message);
            if (!"Network.responseReceived".equals(stringValue(event.get("method")))) {
                continue;
            }
            Map<String, Object> params = asMap(event.get("params"));
            Map<String, Object> response = asMap(params.get("response"));
            String url = stringValue(response.get("url"));
            String mimeType = stringValue(response.get("mimeType")).toLowerCase();
            String resourceType = stringValue(params.get("type"));
            if (isUsableMediaResponse(url, mimeType, resourceType)) {
                if (isPreferredAudioResponse(url, mimeType)) {
                    return url;
                }
                if (!StringUtils.hasText(fallbackMediaUrl)) {
                    fallbackMediaUrl = url;
                    fallbackDeadline = Math.min(deadline, System.nanoTime() + Duration.ofSeconds(5).toNanos());
                }
            }
        }
        return fallbackMediaUrl;
    }

    static boolean isUsableMediaResponse(String url, String mimeType, String resourceType) {
        if (!StringUtils.hasText(url) || !(url.startsWith("http://") || url.startsWith("https://"))) {
            return false;
        }
        String normalizedMimeType = mimeType == null ? "" : mimeType.toLowerCase();
        return "Media".equals(resourceType)
            || normalizedMimeType.startsWith("video/")
            || normalizedMimeType.startsWith("audio/");
    }

    static boolean isPreferredAudioResponse(String url, String mimeType) {
        String normalizedUrl = url == null ? "" : url.toLowerCase();
        String normalizedMimeType = mimeType == null ? "" : mimeType.toLowerCase();
        return normalizedMimeType.startsWith("audio/")
            || normalizedUrl.contains("media-audio")
            || normalizedUrl.contains("mime_type=audio");
    }

    private PageMetadata readPageMetadata(WebSocket webSocket, BlockingQueue<String> messages, int commandId) {
        String expression = "JSON.stringify({title:document.title||document.querySelector('meta[name=description]')?.content||'',"
            + "coverUrl:document.querySelector('meta[name=\"lark:url:video_cover_image_url\"]')?.content||''})";
        sendCommand(webSocket, commandId, "Runtime.evaluate", Map.of(
            "expression", expression,
            "returnByValue", true
        ));
        long deadline = System.nanoTime() + Duration.ofSeconds(2).toNanos();
        while (System.nanoTime() < deadline) {
            try {
                String message = messages.poll(200, TimeUnit.MILLISECONDS);
                if (!StringUtils.hasText(message)) {
                    continue;
                }
                Map<String, Object> response = JsonUtils.toMap(message);
                if (!String.valueOf(commandId).equals(stringValue(response.get("id")))) {
                    continue;
                }
                String value = stringValue(getValue(response, "result", "result", "value"));
                Map<String, Object> metadata = JsonUtils.toMap(value);
                return new PageMetadata(
                    cleanTitle(stringValue(metadata.get("title"))),
                    stringValue(metadata.get("coverUrl"))
                );
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return new PageMetadata("", "");
    }

    private void sendCommand(WebSocket webSocket, int id, String method, Map<String, Object> params) {
        webSocket.sendText(JsonUtils.toJson(Map.of(
            "id", id,
            "method", method,
            "params", params
        )), true).join();
    }

    private Optional<String> browserExecutable() {
        String configured = System.getenv("CHROME_BIN");
        List<String> candidates = List.of(
            configured == null ? "" : configured,
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/usr/bin/google-chrome",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        );
        return candidates.stream()
            .filter(StringUtils::hasText)
            .filter(candidate -> Files.isExecutable(Path.of(candidate)))
            .findFirst();
    }

    private int availablePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            socket.setReuseAddress(true);
            return socket.getLocalPort();
        }
    }

    private void stopProcess(Process process) {
        process.descendants().forEach(ProcessHandle::destroy);
        process.destroy();
        try {
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.descendants().forEach(ProcessHandle::destroyForcibly);
                process.destroyForcibly();
                process.waitFor(2, TimeUnit.SECONDS);
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        }
    }

    private void deleteRecursively(Path root) {
        if (root == null || !Files.exists(root)) {
            return;
        }
        try (var paths = Files.walk(root)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private static Object getValue(Object root, String... path) {
        Object current = root;
        for (String segment : path) {
            current = asMap(current).get(segment);
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    private static String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String cleanTitle(String title) {
        if (!StringUtils.hasText(title)) {
            return "";
        }
        return title.replaceFirst("\\s*-\\s*抖音$", "").trim();
    }

    public record BrowserMedia(String mediaUrl, String title, String coverUrl) {
    }

    private record PageMetadata(String title, String coverUrl) {
    }

    private static final class CdpListener implements WebSocket.Listener {
        private final BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        private final StringBuilder partialMessage = new StringBuilder();

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            partialMessage.append(data);
            if (last) {
                messages.offer(partialMessage.toString());
                partialMessage.setLength(0);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            log.debug("Chrome/Chromium DevTools WebSocket异常", error);
        }

        BlockingQueue<String> messages() {
            return messages;
        }
    }
}
