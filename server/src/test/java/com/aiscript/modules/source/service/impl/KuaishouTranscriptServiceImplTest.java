package com.aiscript.modules.source.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.integration.asr.AsrClient;
import com.aiscript.integration.parser.VideoParserClient;
import com.aiscript.modules.source.dto.KuaishouTranscriptDTO;
import com.aiscript.modules.source.vo.KuaishouTranscriptVO;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KuaishouTranscriptServiceImplTest {
    @Mock
    private VideoParserClient videoParserClient;
    @Mock
    private AsrClient asrClient;

    private KuaishouTranscriptServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new KuaishouTranscriptServiceImpl(videoParserClient, asrClient);
    }

    @Test
    void extractsShortUrlFromShareTextAndTranscribesVideo() {
        String shareUrl = "https://v.kuaishou.com/AbC123";
        String videoUrl = "https://video.kwaicdn.com/target.mp4";
        when(videoParserClient.parseShareUrl(shareUrl)).thenReturn(Map.of(
            "platform", "kuaishou",
            "parseMode", "real_video",
            "resolvedUrl", "https://www.kuaishou.com/short-video/3x123",
            "videoUrl", videoUrl,
            "title", "作品配文",
            "copy", "作品配文",
            "authorName", "作者"
        ));
        when(asrClient.transcribe(videoUrl)).thenReturn(" 这是视频里的语音文案。 ");

        KuaishouTranscriptDTO dto = new KuaishouTranscriptDTO();
        dto.setUrl("复制打开快手，看看这个作品 " + shareUrl + " 更多精彩");

        KuaishouTranscriptVO result = service.extract(dto);

        assertThat(result.getShareUrl()).isEqualTo(shareUrl);
        assertThat(result.getPlatform()).isEqualTo("kuaishou");
        assertThat(result.getCaption()).isEqualTo("作品配文");
        assertThat(result.getTranscript()).isEqualTo("这是视频里的语音文案。");
        assertThat(result.getTranscriptSource()).isEqualTo("asr");
    }

    @Test
    void rejectsLookalikeDomainBeforeCallingParser() {
        KuaishouTranscriptDTO dto = new KuaishouTranscriptDTO();
        dto.setUrl("https://kuaishou.com.evil.example/video/1");

        assertThatThrownBy(() -> service.extract(dto))
            .isInstanceOfSatisfying(BusinessException.class, exception -> {
                assertThat(exception.getResultCode()).isEqualTo(ResultCode.PARAM_ERROR);
                assertThat(exception.getMessage()).isEqualTo("仅支持快手分享链接");
            });

        verify(videoParserClient, never()).parseShareUrl(dto.getUrl());
    }

    @Test
    void rejectsUrlOnlyFallbackWithoutCallingAsr() {
        String shareUrl = "https://ksurl.cn/AbC123";
        when(videoParserClient.parseShareUrl(shareUrl)).thenReturn(Map.of(
            "platform", "kuaishou",
            "parseMode", "url_only",
            "videoUrl", shareUrl
        ));
        KuaishouTranscriptDTO dto = new KuaishouTranscriptDTO();
        dto.setUrl(shareUrl);

        assertThatThrownBy(() -> service.extract(dto))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("未解析到快手视频直链");

        verify(asrClient, never()).transcribe(shareUrl);
    }
}
