package com.aiscript.integration.parser;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

class DouyinBrowserMediaResolverTest {
    @Test
    void acceptsVideoAndAudioResponsesFromBrowserNetwork() {
        assertTrue(DouyinBrowserMediaResolver.isUsableMediaResponse(
            "https://media.example.com/video.mp4", "video/mp4", "Fetch"
        ));
        assertTrue(DouyinBrowserMediaResolver.isUsableMediaResponse(
            "https://media.example.com/audio", "audio/mp4", "XHR"
        ));
    }

    @Test
    void rejectsBlobUrlsAndHtmlResponses() {
        assertFalse(DouyinBrowserMediaResolver.isUsableMediaResponse(
            "blob:https://www.douyin.com/example", "video/mp4", "Media"
        ));
        assertFalse(DouyinBrowserMediaResolver.isUsableMediaResponse(
            "https://www.douyin.com/video/123", "text/html", "Document"
        ));
    }

    @Test
    void prefersAudioTrackForSpeechRecognition() {
        assertTrue(DouyinBrowserMediaResolver.isPreferredAudioResponse(
            "https://media.example.com/media-audio-und-mp4a/", "video/mp4"
        ));
        assertFalse(DouyinBrowserMediaResolver.isPreferredAudioResponse(
            "https://media.example.com/media-video-avc1/", "video/mp4"
        ));
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "RUN_DOUYIN_LIVE_TEST", matches = "true")
    void resolvesDownloadsAndConvertsCurrentDouyinMedia() throws Exception {
        DouyinBrowserMediaResolver resolver = new DouyinBrowserMediaResolver();

        DouyinBrowserMediaResolver.BrowserMedia result = resolver.resolve(
            "https://www.douyin.com/video/7614745956806924706"
        ).orElseThrow();

        assertTrue(result.mediaUrl().startsWith("https://"));
        assertTrue(DouyinBrowserMediaResolver.isPreferredAudioResponse(result.mediaUrl(), ""));

        Path tempDir = Files.createTempDirectory("douyin-browser-live-test-");
        try {
            Path mediaFile = tempDir.resolve("input.mp4");
            Path audioFile = tempDir.resolve("output.mp3");
            HttpRequest request = HttpRequest.newBuilder(URI.create(result.mediaUrl()))
                .timeout(Duration.ofSeconds(60))
                .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15")
                .header("Referer", "https://www.douyin.com/")
                .GET()
                .build();
            HttpResponse<Path> response = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build()
                .send(request, HttpResponse.BodyHandlers.ofFile(mediaFile));
            assertTrue(response.statusCode() >= 200 && response.statusCode() < 300);

            Process ffmpeg = new ProcessBuilder(
                "ffmpeg", "-y", "-i", mediaFile.toString(), "-vn", "-t", "2",
                "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", audioFile.toString()
            ).redirectErrorStream(true).start();
            ffmpeg.getInputStream().readAllBytes();
            assertTrue(ffmpeg.waitFor(30, TimeUnit.SECONDS));
            assertEquals(0, ffmpeg.exitValue());
            assertTrue(Files.size(audioFile) > 0);
        } finally {
            try (var paths = Files.walk(tempDir)) {
                paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (Exception ignored) {
                    }
                });
            }
        }
    }
}
