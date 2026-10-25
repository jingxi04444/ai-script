package com.aiscript.integration.viral;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiscript.config.MarketViralProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class PythonViralSearchClientTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PythonViralSearchClient client = new PythonViralSearchClient(
        new MarketViralProperties(), objectMapper
    );

    @Test
    void parsesPythonSkillResponseAndFilteringStats() throws Exception {
        var data = objectMapper.readTree("""
            {
              "rawCandidateCount": 12,
              "candidateCount": 8,
              "filtered": 6,
              "candidates": [{
                "platform": "douyin",
                "externalId": "123",
                "category": "油烟机",
                "title": "油烟机实测",
                "authorName": "作者",
                "sourceUrl": "https://www.douyin.com/video/123",
                "coverUrl": "https://cdn.example/cover.jpg",
                "tags": "油烟机,单品测评",
                "durationSeconds": 47,
                "likeCount": 120000,
                "commentCount": 3100,
                "collectCount": 8000,
                "shareCount": 900,
                "publishedAt": "2026-10-24T10:20:30+08:00",
                "discoveryQuery": "油烟机测评"
              }],
              "rejectedReasons": {"疑似多品横测或榜单内容：横评": 2},
              "rejectedSamples": [{"platform":"douyin","title":"3款横评","reason":"疑似多品横测或榜单内容：横评"}],
              "warnings": ["小红书详情失败"]
            }
            """);

        ViralSearchResult result = client.parseResult(data);

        assertThat(result.candidates()).hasSize(1);
        assertThat(result.candidates().get(0).durationSeconds()).isEqualTo(47);
        assertThat(result.candidates().get(0).likeCount()).isEqualTo(120_000);
        assertThat(result.candidates().get(0).publishedAt().getHour()).isEqualTo(10);
        assertThat(result.filteredCount()).isEqualTo(6);
        assertThat(result.rejectedReasons()).containsKey("疑似多品横测或榜单内容：横评");
        assertThat(result.warnings()).containsExactly("小红书详情失败");
    }

    @Test
    void skipsMalformedCandidates() throws Exception {
        var data = objectMapper.readTree("""
            {"candidates":[{"platform":"douyin","title":"missing id"}]}
            """);

        assertThat(client.parseResult(data).candidates()).isEmpty();
    }
}
