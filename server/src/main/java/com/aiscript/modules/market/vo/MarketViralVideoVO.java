package com.aiscript.modules.market.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MarketViralVideoVO {
    private String id;
    private String category;
    private String platform;
    private String externalId;
    private String title;
    private String authorName;
    private String sourceUrl;
    private String coverUrl;
    private String tags;
    private Integer durationSeconds;
    private Long likeCount;
    private Long commentCount;
    private Long collectCount;
    private Long shareCount;
    private LocalDateTime publishedAt;
    private LocalDateTime lastSeenAt;
    private String discoveryQuery;
    private Boolean favorited;
}
