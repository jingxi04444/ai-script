package com.aiscript.integration.viral;

import java.time.LocalDateTime;

public record ViralSearchCandidate(
    String platform,
    String externalId,
    String category,
    String title,
    String authorName,
    String sourceUrl,
    String coverUrl,
    String tags,
    Integer durationSeconds,
    long likeCount,
    long commentCount,
    long collectCount,
    long shareCount,
    LocalDateTime publishedAt,
    String discoveryQuery
) {
    public String searchableText() {
        return (title == null ? "" : title) + " " + (tags == null ? "" : tags);
    }
}
