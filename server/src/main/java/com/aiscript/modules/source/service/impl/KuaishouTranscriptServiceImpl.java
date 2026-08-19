package com.aiscript.modules.source.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.UrlUtils;
import com.aiscript.integration.asr.AsrClient;
import com.aiscript.integration.parser.VideoParserClient;
import com.aiscript.modules.source.dto.KuaishouTranscriptDTO;
import com.aiscript.modules.source.service.KuaishouTranscriptService;
import com.aiscript.modules.source.vo.KuaishouTranscriptVO;
import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class KuaishouTranscriptServiceImpl implements KuaishouTranscriptService {
    private static final Set<String> KUAISHOU_ROOT_DOMAINS = Set.of(
        "kuaishou.com",
        "kuaishou.cn",
        "gifshow.com",
        "ksurl.cn"
    );

    private final VideoParserClient videoParserClient;
    private final AsrClient asrClient;

    public KuaishouTranscriptServiceImpl(VideoParserClient videoParserClient, AsrClient asrClient) {
        this.videoParserClient = videoParserClient;
        this.asrClient = asrClient;
    }

    @Override
    public KuaishouTranscriptVO extract(KuaishouTranscriptDTO dto) {
        String shareUrl = validatedShareUrl(dto);
        Map<String, Object> parsed = videoParserClient.parseShareUrl(shareUrl);
        String platform = value(parsed.get("platform"));
        String parseMode = value(parsed.get("parseMode"));
        String videoUrl = value(parsed.get("videoUrl"));
        if (!"kuaishou".equalsIgnoreCase(platform)) {
            throw new BusinessException("链接解析结果不是快手视频");
        }
        if (!"real_video".equals(parseMode) || !isHttpUrl(videoUrl)) {
            throw new BusinessException("未解析到快手视频直链，链接可能已失效、作品不可见或触发了平台风控");
        }

        String transcript = asrClient.transcribe(videoUrl);
        if (!StringUtils.hasText(transcript)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "ASR 服务未返回文案内容");
        }

        KuaishouTranscriptVO vo = new KuaishouTranscriptVO();
        vo.setPlatform("kuaishou");
        vo.setShareUrl(shareUrl);
        vo.setResolvedUrl(value(parsed.get("resolvedUrl")));
        vo.setVideoUrl(videoUrl);
        vo.setTitle(value(parsed.get("title")));
        vo.setAuthorName(value(parsed.get("authorName")));
        vo.setCoverUrl(value(parsed.get("coverUrl")));
        vo.setCaption(firstText(parsed.get("copy"), parsed.get("description"), parsed.get("title")));
        vo.setTranscript(transcript.trim());
        vo.setTranscriptSource("asr");
        return vo;
    }

    private String validatedShareUrl(KuaishouTranscriptDTO dto) {
        String shareUrl = UrlUtils.extractFirstHttpUrl(dto.getUrl());
        if (!StringUtils.hasText(shareUrl)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "未识别到有效的快手分享链接");
        }
        requireKuaishouUrl(shareUrl);
        return shareUrl;
    }

    private void requireKuaishouUrl(String url) {
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (!("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                || !StringUtils.hasText(host)
                || !isKuaishouHost(host)) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "仅支持快手分享链接");
            }
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "快手分享链接格式不正确");
        }
    }

    private boolean isKuaishouHost(String host) {
        String lowerHost = host.toLowerCase(Locale.ROOT);
        return KUAISHOU_ROOT_DOMAINS.stream()
            .anyMatch(domain -> lowerHost.equals(domain) || lowerHost.endsWith("." + domain));
    }

    private boolean isHttpUrl(String url) {
        return url.startsWith("http://") || url.startsWith("https://");
    }

    private String firstText(Object... values) {
        for (Object value : values) {
            String text = value(value);
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return "";
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
