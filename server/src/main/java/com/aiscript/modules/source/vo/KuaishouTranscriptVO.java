package com.aiscript.modules.source.vo;

import lombok.Data;

@Data
public class KuaishouTranscriptVO {
    private String platform;
    private String shareUrl;
    private String resolvedUrl;
    private String videoUrl;
    private String title;
    private String authorName;
    private String coverUrl;
    private String caption;
    private String transcript;
    private String transcriptSource;
}
