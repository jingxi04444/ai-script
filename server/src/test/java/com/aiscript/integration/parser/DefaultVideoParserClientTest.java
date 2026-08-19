package com.aiscript.integration.parser;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.framework.secret.SecretProperties;
import com.aiscript.modules.system.service.ProviderConfigService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class DefaultVideoParserClientTest {
    private DefaultVideoParserClient client;

    @BeforeEach
    void setUp() {
        SecretProperties secretProperties = new SecretProperties();
        secretProperties.setCipherKey("test-cipher-key");
        client = new DefaultVideoParserClient(
            Mockito.mock(ProviderConfigService.class),
            new SecretCipherService(secretProperties)
        );
    }

    @Test
    void extractsKuaishouPhotoIdFromSupportedCanonicalUrls() {
        assertThat(client.extractKuaishouVideoId("https://www.kuaishou.com/short-video/3xTarget"))
            .isEqualTo("3xTarget");
        assertThat(client.extractKuaishouVideoId("https://v.kuaishou.com/fw/photo/3xTarget?shareId=1"))
            .isEqualTo("3xTarget");
        assertThat(client.extractKuaishouVideoId("https://www.kuaishou.com/page?photoId=3xTarget"))
            .isEqualTo("3xTarget");
    }

    @Test
    void bindsMediaToTargetPhotoInsteadOfRecommendation() {
        Map<String, Object> recommendation = Map.of(
            "id", "3xRecommendation",
            "photoUrl", "https://video.kwaicdn.com/recommendation.mp4"
        );
        Map<String, Object> target = Map.of(
            "id", "3xTarget",
            "caption", "目标作品",
            "videoResource", Map.of(
                "adaptationSet", List.of(Map.of(
                    "representation", List.of(Map.of(
                        "url", "https://video.kwaicdn.com/target.mp4"
                    ))
                ))
            )
        );
        Map<String, Object> pageState = Map.of(
            "feed", List.of(recommendation),
            "VisionVideoDetailPhoto:3xTarget", target
        );

        Map<String, Object> matched = client.findExactKuaishouPhoto(pageState, "3xTarget")
            .orElseThrow();

        assertThat(matched).isSameAs(target);
        assertThat(client.findKuaishouVideoUrl(matched))
            .isEqualTo("https://video.kwaicdn.com/target.mp4");
    }
}
