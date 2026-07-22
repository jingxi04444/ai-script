package com.aiscript.integration.parser;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.common.util.UrlUtils;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DefaultVideoParserClient implements VideoParserClient {
    private final ProviderConfigService providerConfigService;
    private final SecretCipherService secretCipherService;
    private final HttpClient redirectClient;
    private final HttpClient noRedirectClient;

    public DefaultVideoParserClient(ProviderConfigService providerConfigService, SecretCipherService secretCipherService) {
        this.providerConfigService = providerConfigService;
        this.secretCipherService = secretCipherService;
        this.redirectClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(15))
            .build();
        this.noRedirectClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    }

    @Override
    public Map<String, Object> parseShareUrl(String url) {
        String normalizedUrl = UrlUtils.extractFirstUrl(url);
        if (!StringUtils.hasText(normalizedUrl)) {
            throw new BusinessException("未识别到有效视频链接，请粘贴包含 http/https 的分享链接");
        }
        SysApiProviderConfig provider = providerConfigService.firstEnabled("video_parse");
        if (provider == null || !StringUtils.hasText(provider.getEndpointUrl())) {
            return localParse(normalizedUrl).orElseGet(() -> fallback(normalizedUrl));
        }
        Map<String, Object> payload = Map.of("url", normalizedUrl);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(provider.getEndpointUrl()))
            .timeout(Duration.ofMillis(provider.getTimeoutMs() == null ? 8000 : provider.getTimeoutMs()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtils.toJson(payload)));
        if (StringUtils.hasText(provider.getApiKeyEncrypted())) {
            builder.header("Authorization", "Bearer " + secretCipherService.decrypt(provider.getApiKeyEncrypted()));
        }
        try {
            HttpResponse<String> response = redirectClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("视频解析Provider调用失败：" + response.statusCode());
            }
            Map<String, Object> body = JsonUtils.toMap(response.body());
            if (body.isEmpty()) {
                throw new BusinessException("视频解析Provider返回为空");
            }
            return unwrapData(body);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("视频解析Provider调用被中断");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("视频解析Provider调用失败：" + ex.getMessage());
        }
    }

    private Optional<Map<String, Object>> localParse(String url) {
        String platform = detectPlatform(url);
        try {
            if ("douyin".equals(platform)) {
                return Optional.of(parseDouyin(url));
            }
            if ("kuaishou".equals(platform)) {
                return Optional.of(parseKuaishou(url));
            }
            if ("bilibili".equals(platform)) {
                return Optional.of(parseBilibili(url));
            }
            if ("xiaohongshu".equals(platform)) {
                return Optional.of(parseRedBook(url));
            }
        } catch (Exception ignored) {
        }
        return Optional.empty();
    }

    private Map<String, Object> parseDouyin(String url) throws Exception {
        String pageUrl = firstRedirectLocation(url, "https://www.douyin.com/").orElseGet(() -> {
            try {
                return resolveUrl(url, "https://www.douyin.com/");
            } catch (Exception ex) {
                return url;
            }
        });
        Map<String, Object> result = fallback(url);
        result.put("platform", "douyin");
        result.put("status", "parsed");
        result.put("resolvedUrl", pageUrl);

        String awemeId = extractDouyinAwemeId(pageUrl);
        if (StringUtils.hasText(awemeId)) {
            String canonicalUrl = "https://www.iesdouyin.com/share/video/" + awemeId + "/";
            Optional<Map<String, Object>> routerResult = parseDouyinRouterData(url, canonicalUrl, awemeId);
            if (routerResult.isPresent()) {
                return routerResult.get();
            }
            Optional<Map<String, Object>> itemInfoResult = parseDouyinItemInfo(url, awemeId);
            if (itemInfoResult.isPresent()) {
                return itemInfoResult.get();
            }
        }

        String html = getText(pageUrl, "https://www.douyin.com/");
        String title = firstRegex(html, "\\\"desc\\\"\\s*:\\s*\\\"(.*?)\\\"");
        if (StringUtils.hasText(title)) {
            result.put("title", cleanJsonText(title));
        }
        String videoUrl = firstRegex(html, "https?:\\\\/\\\\/[^\\\"]*?playwm[^\\\"]*");
        if (!StringUtils.hasText(videoUrl)) {
            videoUrl = firstRegex(html, "https?:\\\\/\\\\/[^\\\"]*?play[^\\\"]*?\\.mp4[^\\\"]*");
        }
        if (!StringUtils.hasText(videoUrl)) {
            videoUrl = firstRegex(html, "\\\"play_addr\\\".*?\\\"url_list\\\"\\s*:\\s*\\[(?:\\\")?(https?:\\\\/\\\\/[^\\\"]+)");
        }
        if (StringUtils.hasText(videoUrl)) {
            videoUrl = cleanJsonText(videoUrl).replace("playwm", "play");
            result.put("videoUrl", resolveUrl(videoUrl, "https://www.douyin.com/"));
            result.put("parseMode", "real_video");
        }
        String coverUrl = firstRegex(html, "https?:\\\\/\\\\/[^\\\"]*?(?:cover|image)[^\\\"]*?");
        if (StringUtils.hasText(coverUrl)) {
            result.put("coverUrl", cleanJsonText(coverUrl));
        }
        return result;
    }

    private Optional<Map<String, Object>> parseDouyinRouterData(String sourceUrl, String canonicalUrl, String awemeId) {
        try {
            String html = getText(canonicalUrl, "https://www.douyin.com/");
            String routerJson = firstRegex(html, "window\\._ROUTER_DATA\\s*=\\s*(\\{.*?\\})\\s*</script>");
            if (!StringUtils.hasText(routerJson)) {
                routerJson = firstRegex(html, "window\\.__ROUTER_DATA__\\s*=\\s*(\\{.*?\\})\\s*</script>");
            }
            if (!StringUtils.hasText(routerJson)) {
                return Optional.empty();
            }
            Map<String, Object> routerData = JsonUtils.toMap(routerJson);
            if (routerData.isEmpty()) {
                return Optional.empty();
            }
            Map<String, Object> item = douyinVideoItem(routerData);
            if (item.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(buildDouyinResult(sourceUrl, canonicalUrl, awemeId, item));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private Map<String, Object> douyinVideoItem(Map<String, Object> routerData) {
        Map<String, Object> loaderData = asMap(routerData.get("loaderData"));
        for (Map.Entry<String, Object> entry : loaderData.entrySet()) {
            String key = entry.getKey();
            if (!key.contains("video") && !key.contains("note")) {
                continue;
            }
            Map<String, Object> pageData = asMap(entry.getValue());
            Map<String, Object> videoInfoRes = asMap(pageData.get("videoInfoRes"));
            List<?> itemList = asList(videoInfoRes.get("item_list"));
            if (!itemList.isEmpty()) {
                Map<String, Object> item = asMap(itemList.get(0));
                if (!item.isEmpty()) {
                    return item;
                }
            }
        }
        List<?> awemeDetails = asList(routerData.get("aweme_details"));
        if (!awemeDetails.isEmpty()) {
            return asMap(awemeDetails.get(0));
        }
        return Map.of();
    }

    private Map<String, Object> buildDouyinResult(String sourceUrl, String canonicalUrl, String awemeId, Map<String, Object> item) throws Exception {
        Map<String, Object> result = fallback(sourceUrl);
        result.put("platform", "douyin");
        result.put("status", "parsed");
        result.put("awemeId", awemeId);
        result.put("resolvedUrl", canonicalUrl);

        String title = stringValue(item.get("desc"));
        if (StringUtils.hasText(title)) {
            result.put("title", title);
            result.put("copy", title);
        }
        Map<String, Object> author = asMap(item.get("author"));
        result.put("authorName", stringValue(author.get("nickname")));
        String authorAvatar = firstNoWebpUrl(asList(getValue(author, "avatar_thumb", "url_list")));
        if (StringUtils.hasText(authorAvatar)) {
            result.put("authorAvatar", authorAvatar);
        }

        List<Map<String, Object>> images = douyinImages(item);
        if (!images.isEmpty()) {
            result.put("images", images);
            result.put("videoUrl", "");
            result.put("parseMode", "image_gallery");
        } else {
            String videoUrl = getString(item, "video", "play_addr", "url_list", 0).replace("playwm", "play");
            if (!StringUtils.hasText(videoUrl)) {
                String videoId = getString(item, "video", "play_addr", "uri");
                if (StringUtils.hasText(videoId)) {
                    videoUrl = "https://aweme.snssdk.com/aweme/v1/play/?video_id=" + videoId + "&ratio=720p&line=0";
                }
            }
            if (StringUtils.hasText(videoUrl)) {
                result.put("videoUrl", resolveFinalVideoUrl(videoUrl, "https://www.douyin.com/"));
                result.put("parseMode", "real_video");
            }
        }

        String coverUrl = firstNoWebpUrl(asList(getValue(item, "video", "cover", "url_list")));
        if (StringUtils.hasText(coverUrl)) {
            result.put("coverUrl", coverUrl);
        }
        String musicUrl = getString(item, "video", "play_addr", "uri");
        if (StringUtils.hasText(musicUrl)) {
            result.put("musicUrl", musicUrl);
        }
        return result;
    }

    private List<Map<String, Object>> douyinImages(Map<String, Object> item) {
        List<Map<String, Object>> images = new ArrayList<>();
        for (Object value : asList(item.get("images"))) {
            Map<String, Object> image = asMap(value);
            String imageUrl = firstNoWebpUrl(asList(image.get("url_list")));
            if (!StringUtils.hasText(imageUrl)) {
                continue;
            }
            Map<String, Object> imageInfo = new HashMap<>();
            imageInfo.put("url", imageUrl);
            String livePhotoUrl = getString(image, "video", "play_addr", "url_list", 0);
            if (StringUtils.hasText(livePhotoUrl)) {
                imageInfo.put("livePhotoUrl", livePhotoUrl);
            }
            images.add(imageInfo);
        }
        return images;
    }

    private Optional<Map<String, Object>> parseDouyinItemInfo(String sourceUrl, String awemeId) {
        String itemInfoUrl = "https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=" + awemeId;
        try {
            String body = getText(itemInfoUrl, "https://www.douyin.com/");
            Map<String, Object> result = fallback(sourceUrl);
            result.put("platform", "douyin");
            result.put("status", "parsed");
            result.put("awemeId", awemeId);
            String title = firstRegex(body, "\\\"desc\\\"\\s*:\\s*\\\"(.*?)\\\"");
            if (StringUtils.hasText(title)) {
                result.put("title", cleanJsonText(title));
                result.put("copy", cleanJsonText(title));
            }
            String authorName = firstRegex(body, "\\\"nickname\\\"\\s*:\\s*\\\"(.*?)\\\"");
            if (StringUtils.hasText(authorName)) {
                result.put("authorName", cleanJsonText(authorName));
            }
            String videoUrl = firstRegex(body, "\\\"play_addr\\\".*?\\\"url_list\\\"\\s*:\\s*\\[\\\"(https?:\\\\/\\\\/[^\\\"]+)");
            if (!StringUtils.hasText(videoUrl)) {
                videoUrl = firstRegex(body, "https?:\\\\/\\\\/[^\\\"]*?playwm[^\\\"]*");
            }
            if (!StringUtils.hasText(videoUrl)) {
                String videoId = firstRegex(body, "\\\"play_addr\\\".*?\\\"uri\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
                if (StringUtils.hasText(videoId)) {
                    videoUrl = "https://aweme.snssdk.com/aweme/v1/play/?video_id=" + cleanJsonText(videoId) + "&ratio=720p&line=0";
                }
            }
            if (!StringUtils.hasText(videoUrl)) {
                String videoId = firstRegex(body, "\\\"video_id\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"");
                if (StringUtils.hasText(videoId)) {
                    videoUrl = "https://aweme.snssdk.com/aweme/v1/play/?video_id=" + cleanJsonText(videoId) + "&ratio=720p&line=0";
                }
            }
            if (!StringUtils.hasText(videoUrl)) {
                return Optional.empty();
            }
            videoUrl = cleanJsonText(videoUrl).replace("playwm", "play");
            result.put("videoUrl", resolveFinalVideoUrl(videoUrl, "https://www.douyin.com/"));
            result.put("parseMode", "real_video");
            String coverUrl = firstRegex(body, "\\\"cover\\\".*?\\\"url_list\\\"\\s*:\\s*\\[\\\"(https?:\\\\/\\\\/[^\\\"]+)");
            if (StringUtils.hasText(coverUrl)) {
                result.put("coverUrl", cleanJsonText(coverUrl));
            }
            return Optional.of(result);
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private Map<String, Object> parseKuaishou(String url) throws Exception {
        HttpResponse<Void> redirectResponse = getNoRedirect(url, "https://v.kuaishou.com/", null);
        String cookie = cookies(redirectResponse);
        String pageUrl = redirectResponse.headers().firstValue("location").orElse(url);
        pageUrl = absolutize(pageUrl, "https://v.kuaishou.com/").replace("/fw/long-video/", "/fw/photo/");
        String html = getText(pageUrl, "https://v.kuaishou.com/", cookie);
        Map<String, Object> result = fallback(url);
        result.put("platform", "kuaishou");
        result.put("status", "parsed");
        result.put("resolvedUrl", pageUrl);
        Optional<Map<String, Object>> initStateResult = parseKuaishouInitState(url, pageUrl, html);
        if (initStateResult.isPresent()) {
            return initStateResult.get();
        }
        String caption = firstRegex(html, "\\\"caption\\\"\\s*:\\s*\\\"(.*?)\\\"");
        if (StringUtils.hasText(caption)) {
            result.put("title", cleanJsonText(caption));
            result.put("copy", cleanJsonText(caption));
        }
        String userName = firstRegex(html, "\\\"userName\\\"\\s*:\\s*\\\"(.*?)\\\"");
        if (StringUtils.hasText(userName)) {
            result.put("authorName", cleanJsonText(userName));
        }
        String videoUrl = firstRegex(html, "\\\"url\\\"\\s*:\\s*\\\"(https?:\\\\/\\\\/[^\\\"]*?\\.mp4[^\\\"]*)\\\"");
        if (StringUtils.hasText(videoUrl)) {
            result.put("videoUrl", cleanJsonText(videoUrl));
            result.put("parseMode", "real_video");
        }
        String coverUrl = firstRegex(html, "\\\"coverUrls\\\".*?\\\"url\\\"\\s*:\\s*\\\"(https?:\\\\/\\\\/[^\\\"]*)\\\"");
        if (StringUtils.hasText(coverUrl)) {
            result.put("coverUrl", cleanJsonText(coverUrl));
        }
        return result;
    }

    private Optional<Map<String, Object>> parseKuaishouInitState(String sourceUrl, String pageUrl, String html) {
        String initJson = firstRegex(html, "window\\.INIT_STATE\\s*=\\s*(\\{.*?\\})\\s*</script>");
        if (!StringUtils.hasText(initJson)) {
            return Optional.empty();
        }
        Map<String, Object> initState = JsonUtils.toMap(initJson);
        if (initState.isEmpty()) {
            return Optional.empty();
        }
        String videoUrl = findFirstUrlInKey(initState, "mainMvUrls").orElse("");
        if (!StringUtils.hasText(videoUrl)) {
            return Optional.empty();
        }
        Map<String, Object> result = fallback(sourceUrl);
        result.put("platform", "kuaishou");
        result.put("status", "parsed");
        result.put("resolvedUrl", pageUrl);
        result.put("parseMode", "real_video");
        result.put("videoUrl", cleanJsonText(videoUrl));
        findStringByKey(initState, "caption").ifPresent(value -> {
            result.put("title", value);
            result.put("copy", value);
        });
        findStringByKey(initState, "userName").ifPresent(value -> result.put("authorName", value));
        findStringByKey(initState, "headUrl").ifPresent(value -> result.put("authorAvatar", value));
        findFirstUrlInKey(initState, "coverUrls").ifPresent(value -> result.put("coverUrl", value));
        return Optional.of(result);
    }

    private Map<String, Object> parseBilibili(String url) throws Exception {
        String pageUrl = url.contains("b23.tv") ? firstRedirectLocation(url, "https://www.bilibili.com/").orElse(url) : url;
        String bvid = firstRegex(pageUrl, "(BV[a-zA-Z0-9]+)");
        if (!StringUtils.hasText(bvid)) {
            bvid = firstRegex(url, "(BV[a-zA-Z0-9]+)");
        }
        if (!StringUtils.hasText(bvid)) {
            throw new BusinessException("未识别到B站BV号");
        }

        String infoBody = getText("https://api.bilibili.com/x/web-interface/view?bvid=" + bvid, "https://www.bilibili.com/");
        Map<String, Object> info = JsonUtils.toMap(infoBody);
        Map<String, Object> data = asMap(info.get("data"));
        if (data.isEmpty()) {
            throw new BusinessException("B站视频信息为空");
        }

        String cid = stringValue(data.get("cid"));
        String videoUrl = "";
        if (StringUtils.hasText(cid)) {
            String playBody = getText("https://api.bilibili.com/x/player/playurl?bvid=" + bvid + "&cid=" + cid + "&qn=80&fnval=16", "https://www.bilibili.com/");
            videoUrl = getString(JsonUtils.toMap(playBody), "data", "dash", "video", 0, "baseUrl");
        }

        Map<String, Object> owner = asMap(data.get("owner"));
        Map<String, Object> result = fallback(url);
        result.put("platform", "bilibili");
        result.put("status", "parsed");
        result.put("parseMode", "real_video");
        result.put("resolvedUrl", pageUrl);
        result.put("videoId", bvid);
        result.put("title", stringValue(data.get("title")));
        result.put("copy", stringValue(data.get("title")));
        result.put("coverUrl", stringValue(data.get("pic")));
        result.put("authorName", stringValue(owner.get("name")));
        result.put("authorAvatar", stringValue(owner.get("face")));
        if (StringUtils.hasText(videoUrl)) {
            result.put("videoUrl", videoUrl);
        }
        return result;
    }

    private Map<String, Object> parseRedBook(String url) throws Exception {
        String pageUrl = url.contains("xhslink.com") ? firstRedirectLocation(url, "https://www.xiaohongshu.com/").orElse(url) : url;
        String html = getText(pageUrl, "https://www.xiaohongshu.com/");
        String initialJson = firstRegex(html, "window\\.__INITIAL_STATE__\\s*=\\s*(.*?)</script>");
        if (!StringUtils.hasText(initialJson)) {
            throw new BusinessException("未从小红书页面解析到笔记数据");
        }
        Map<String, Object> root = JsonUtils.toMap(initialJson.replace("undefined", "null"));
        Map<String, Object> noteRoot = asMap(root.get("note"));
        String noteId = firstNonBlank(stringValue(noteRoot.get("currentNoteId")), stringValue(noteRoot.get("firstNoteId")), extractRedBookNoteId(pageUrl));
        Map<String, Object> noteDetailMap = asMap(noteRoot.get("noteDetailMap"));
        Map<String, Object> noteData = noteData(noteDetailMap, noteId);
        if (noteData.isEmpty()) {
            throw new BusinessException("小红书笔记详情为空");
        }

        String videoUrl = getString(noteData, "video", "media", "stream", "h264", 0, "masterUrl");
        List<Map<String, Object>> images = redBookImages(noteData);
        Map<String, Object> user = asMap(noteData.get("user"));
        String title = stringValue(noteData.get("title"));
        Map<String, Object> result = fallback(url);
        result.put("platform", "xiaohongshu");
        result.put("status", "parsed");
        result.put("resolvedUrl", pageUrl);
        result.put("videoId", noteId);
        result.put("title", title);
        result.put("copy", title);
        result.put("authorName", stringValue(user.get("nickname")));
        result.put("authorAvatar", stringValue(user.get("avatar")));
        if (StringUtils.hasText(videoUrl)) {
            result.put("videoUrl", videoUrl);
            result.put("parseMode", "real_video");
        } else if (!images.isEmpty()) {
            result.put("images", images);
            result.put("videoUrl", "");
            result.put("parseMode", "image_gallery");
        }
        String coverUrl = getString(noteData, "imageList", 0, "urlDefault");
        if (StringUtils.hasText(coverUrl)) {
            result.put("coverUrl", coverUrl);
        }
        return result;
    }

    private String resolveUrl(String url, String referer) throws Exception {
        HttpRequest.Builder builder = requestBuilder(url, referer).GET();
        HttpResponse<Void> response = redirectClient.send(builder.build(), HttpResponse.BodyHandlers.discarding());
        return response.uri().toString();
    }

    private String resolveFinalVideoUrl(String url, String referer) throws Exception {
        return firstRedirectLocation(url, referer).orElseGet(() -> {
            try {
                return resolveUrl(url, referer);
            } catch (Exception ex) {
                return url;
            }
        });
    }

    private Optional<String> firstRedirectLocation(String url, String referer) throws Exception {
        HttpResponse<Void> response = getNoRedirect(url, referer, null);
        return response.headers().firstValue("location").map(location -> absolutize(location, url));
    }

    private HttpResponse<Void> getNoRedirect(String url, String referer, String cookie) throws Exception {
        return noRedirectClient.send(requestBuilder(url, referer, cookie).GET().build(), HttpResponse.BodyHandlers.discarding());
    }

    private String getText(String url, String referer) throws Exception {
        return getText(url, referer, null);
    }

    private String getText(String url, String referer, String cookie) throws Exception {
        HttpResponse<String> response = redirectClient.send(requestBuilder(url, referer, cookie).GET().build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new BusinessException("视频页面请求失败：" + response.statusCode());
        }
        return response.body();
    }

    private HttpRequest.Builder requestBuilder(String url, String referer) {
        return requestBuilder(url, referer, null);
    }

    private HttpRequest.Builder requestBuilder(String url, String referer, String cookie) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(20))
            .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")
            .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        if (StringUtils.hasText(referer)) {
            builder.header("Referer", referer);
        }
        if (StringUtils.hasText(cookie)) {
            builder.header("Cookie", cookie);
        }
        return builder;
    }

    private String cookies(HttpResponse<?> response) {
        return String.join("; ", response.headers().allValues("set-cookie").stream()
            .map(value -> value.split(";", 2)[0])
            .toList());
    }

    private String absolutize(String location, String baseUrl) {
        if (!StringUtils.hasText(location)) {
            return baseUrl;
        }
        if (location.startsWith("http://") || location.startsWith("https://")) {
            return location;
        }
        URI base = URI.create(baseUrl);
        return base.resolve(location).toString();
    }

    private String firstRegex(String text, String regex) {
        Matcher matcher = Pattern.compile(regex, Pattern.DOTALL).matcher(text == null ? "" : text);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String cleanJsonText(String text) {
        return text == null ? "" : text
            .replace("\\/", "/")
            .replace("\\u0026", "&")
            .replace("\\\"", "\"")
            .replace("\\n", "\n");
    }

    private String extractRedBookNoteId(String url) {
        String decoded = URLDecoder.decode(url == null ? "" : url, java.nio.charset.StandardCharsets.UTF_8);
        String[] parts = decoded.split("/");
        for (int index = parts.length - 1; index >= 0; index--) {
            String part = parts[index].split("[?#]", 2)[0];
            if (part.matches("[a-f0-9]{24}")) {
                return part;
            }
        }
        return "";
    }

    private String extractDouyinAwemeId(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }
        String decoded = URLDecoder.decode(url, java.nio.charset.StandardCharsets.UTF_8);
        String id = firstRegex(decoded, "/video/(\\d+)");
        if (!StringUtils.hasText(id)) {
            id = firstRegex(decoded, "modal_id=(\\d+)");
        }
        if (!StringUtils.hasText(id)) {
            id = firstRegex(decoded, "aweme_id=(\\d+)");
        }
        if (!StringUtils.hasText(id)) {
            id = firstRegex(decoded, "note/(\\d+)");
        }
        return id;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> unwrapData(Map<String, Object> body) {
        Object data = body.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            return (Map<String, Object>) dataMap;
        }
        return body;
    }

    private Optional<String> findStringByKey(Object value, String key) {
        if (value instanceof Map<?, ?> map) {
            Object direct = map.get(key);
            if (direct != null && !(direct instanceof Map<?, ?>) && !(direct instanceof List<?>)) {
                String text = cleanJsonText(String.valueOf(direct));
                if (StringUtils.hasText(text)) {
                    return Optional.of(text);
                }
            }
            for (Object child : map.values()) {
                Optional<String> found = findStringByKey(child, key);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        if (value instanceof List<?> list) {
            for (Object child : list) {
                Optional<String> found = findStringByKey(child, key);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    private Optional<String> findFirstUrlInKey(Object value, String key) {
        if (value instanceof Map<?, ?> map) {
            Object direct = map.get(key);
            Optional<String> directUrl = firstUrlFromValue(direct);
            if (directUrl.isPresent()) {
                return directUrl;
            }
            for (Object child : map.values()) {
                Optional<String> found = findFirstUrlInKey(child, key);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        if (value instanceof List<?> list) {
            for (Object child : list) {
                Optional<String> found = findFirstUrlInKey(child, key);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    private Optional<String> firstUrlFromValue(Object value) {
        if (value instanceof String text) {
            String cleaned = cleanJsonText(text);
            if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
                return Optional.of(cleaned);
            }
        }
        if (value instanceof List<?> list) {
            for (Object item : list) {
                Optional<String> found = firstUrlFromValue(item);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        if (value instanceof Map<?, ?> map) {
            for (Object child : map.values()) {
                Optional<String> found = firstUrlFromValue(child);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    private List<?> asList(Object value) {
        if (value instanceof List<?> list) {
            return list;
        }
        return List.of();
    }

    private String getString(Object root, Object... path) {
        Object value = getValue(root, path);
        return value == null ? "" : cleanJsonText(String.valueOf(value));
    }

    private Object getValue(Object root, Object... path) {
        Object current = root;
        for (Object segment : path) {
            if (segment instanceof String key) {
                current = asMap(current).get(key);
            } else if (segment instanceof Integer index) {
                List<?> list = asList(current);
                current = index >= 0 && index < list.size() ? list.get(index) : null;
            }
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    private String stringValue(Object value) {
        return value == null ? "" : cleanJsonText(String.valueOf(value));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value) && !"null".equals(value)) {
                return value;
            }
        }
        return "";
    }

    private String firstNoWebpUrl(List<?> values) {
        String firstUrl = "";
        for (Object value : values) {
            String url = stringValue(value);
            if (!StringUtils.hasText(url)) {
                continue;
            }
            if (!StringUtils.hasText(firstUrl)) {
                firstUrl = url;
            }
            if (!url.endsWith(".webp")) {
                return url;
            }
        }
        return firstUrl;
    }

    private Map<String, Object> noteData(Map<String, Object> noteDetailMap, String noteId) {
        Map<String, Object> detail = asMap(noteDetailMap.get(noteId));
        Map<String, Object> note = asMap(detail.get("note"));
        if (!note.isEmpty()) {
            return note;
        }
        for (Object value : noteDetailMap.values()) {
            note = asMap(asMap(value).get("note"));
            if (!note.isEmpty()) {
                return note;
            }
        }
        return Map.of();
    }

    private List<Map<String, Object>> redBookImages(Map<String, Object> noteData) {
        List<Map<String, Object>> images = new ArrayList<>();
        for (Object item : asList(noteData.get("imageList"))) {
            Map<String, Object> image = asMap(item);
            String imageUrl = stringValue(image.get("urlDefault"));
            if (!StringUtils.hasText(imageUrl)) {
                continue;
            }
            Map<String, Object> imageInfo = new HashMap<>();
            imageInfo.put("url", imageUrl);
            String livePhotoUrl = getString(image, "stream", "h264", 0, "masterUrl");
            if (StringUtils.hasText(livePhotoUrl)) {
                imageInfo.put("livePhotoUrl", livePhotoUrl);
            }
            images.add(imageInfo);
        }
        return images;
    }

    private Map<String, Object> fallback(String url) {
        Map<String, Object> result = new HashMap<>();
        result.put("sourceUrl", url);
        result.put("videoUrl", url);
        result.put("platform", detectPlatform(url));
        result.put("title", "外部视频链接");
        result.put("authorName", "");
        result.put("coverUrl", "");
        result.put("copy", "");
        result.put("status", "parsed");
        result.put("parseMode", "url_only");
        return result;
    }

    private String detectPlatform(String url) {
        String lowerUrl = url == null ? "" : url.toLowerCase();
        if (lowerUrl.contains("douyin")) {
            return "douyin";
        }
        if (lowerUrl.contains("xiaohongshu") || lowerUrl.contains("xhs")) {
            return "xiaohongshu";
        }
        if (lowerUrl.contains("kuaishou")) {
            return "kuaishou";
        }
        if (lowerUrl.contains("bilibili") || lowerUrl.contains("b23.tv")) {
            return "bilibili";
        }
        if (lowerUrl.contains("weibo")) {
            return "weibo";
        }
        if (lowerUrl.contains("ixigua") || lowerUrl.contains("xigua")) {
            return "xigua";
        }
        if (lowerUrl.contains("pipix") || lowerUrl.contains("pipigaoxiao")) {
            return "pipixia";
        }
        if (lowerUrl.contains("weishi")) {
            return "weishi";
        }
        if (lowerUrl.contains("acfun")) {
            return "acfun";
        }
        if (lowerUrl.contains("haokan")) {
            return "haokan";
        }
        if (lowerUrl.contains("twitter") || lowerUrl.contains("x.com")) {
            return "twitter";
        }
        return "unknown";
    }
}
