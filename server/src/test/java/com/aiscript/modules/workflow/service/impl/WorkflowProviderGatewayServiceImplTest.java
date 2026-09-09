package com.aiscript.modules.workflow.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import com.aiscript.integration.image.ImageGenerationClient;
import com.aiscript.integration.llm.LlmClient;
import com.aiscript.integration.audio.MusicGenerationClient;
import com.aiscript.integration.tts.TtsClient;
import com.aiscript.integration.video.VideoAssemblyClient;
import com.aiscript.integration.video.VideoGenerationClient;
import com.aiscript.modules.workflow.dto.WorkflowProviderExecuteDTO;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class WorkflowProviderGatewayServiceImplTest {
    private final LlmClient llm = (system, user) -> "LLM:" + user;
    private final MusicGenerationClient music = (prompt, options) -> Map.of(
        "assetUrl", "https://cdn.example/music.mp3"
    );
    private final ImageGenerationClient image = (prompt, references, options) -> Map.of(
        "assetUrl", "https://cdn.example/image.png"
    );
    private final VideoGenerationClient video = prompt -> "https://cdn.example/video.mp4";
    private final VideoAssemblyClient editor = (clips, options) -> Map.of(
        "assetUrls", clips,
        "outputCount", clips.size()
    );
    private final TtsClient tts = (text, voice) -> "https://cdn.example/voice.mp3";

    @Test
    void routesTextNodeToExistingLlmClient() {
        WorkflowProviderGatewayServiceImpl service = service();
        WorkflowProviderExecuteDTO dto = request("text", Map.of("prompt", "生成卖点文案"));

        var result = service.execute(dto);

        assertEquals("LLM:生成卖点文案", result.getOutput().get("text"));
        assertEquals("text", result.getOutput().get("kind"));
    }

    @Test
    void passesDirectorAndSnapshotReferencesToImageGenerationWithoutDuplicates() {
        String snapshotUrl = "https://cdn.example/director-camera-1.png";
        ImageGenerationClient referenceAwareImage = (prompt, references, options) -> {
            assertEquals(List.of(snapshotUrl), references);
            assertEquals("configured-image-model", options.get("model"));
            return Map.of("assetUrl", "https://cdn.example/generated-scene.png");
        };
        WorkflowProviderGatewayServiceImpl service = new WorkflowProviderGatewayServiceImpl(
            llm, music, referenceAwareImage, video, editor, tts, null, null
        );
        WorkflowProviderExecuteDTO dto = request("image", Map.of(
            "prompt", "保持导演台构图生成产品场景图", "model", "configured-image-model"
        ));
        dto.setInputs(Map.of("upstream", Map.of(
            "director-1", Map.of("kind", "director", "assetUrl", snapshotUrl),
            "director-frame-1", Map.of("kind", "result", "assetUrl", snapshotUrl)
        )));

        var result = service.execute(dto);

        assertEquals("https://cdn.example/generated-scene.png", result.getOutput().get("assetUrl"));
    }

    @Test
    void routesImageNodeToDatabaseBackedImageClient() {
        WorkflowProviderGatewayServiceImpl service = service();

        var result = service.execute(request("image", Map.of("prompt", "产品场景图")));

        assertEquals("https://cdn.example/image.png", result.getOutput().get("assetUrl"));
    }

    @Test
    void creativeLibraryReferenceImagesAndTemplateTextReachImageModel() {
        ImageGenerationClient referenceAwareImage = (prompt, references, options) -> {
            assertTrue(prompt.contains("产品置于窗边"));
            assertTrue(prompt.contains("保持角色身份一致"));
            assertTrue(prompt.contains("视觉风格参考：柔光日常"));
            assertTrue(prompt.contains("避免内容：不要改变产品包装"));
            assertEquals(3, references.size());
            assertTrue(references.containsAll(List.of("https://cdn.example/portrait.png", "https://cdn.example/sheet.png", "https://cdn.example/style.png")));
            assertEquals("chosen-model", options.get("model"));
            return Map.of("assetUrl", "https://cdn.example/result.png");
        };
        var service = new WorkflowProviderGatewayServiceImpl(llm, music, referenceAwareImage, video, editor, tts, null, null);
        var dto = request("image", Map.of("prompt", "产品置于窗边", "model", "chosen-model"));
        dto.setInputs(Map.of("upstream", Map.of(
            "character", Map.of("resource", "保持角色身份一致", "assetUrl", "https://cdn.example/portrait.png", "assetUrls", List.of("https://cdn.example/portrait.png", "https://cdn.example/sheet.png")),
            "style", Map.of("resource", "视觉风格参考：柔光日常\n避免内容：不要改变产品包装", "assetUrl", "https://cdn.example/style.png")
        )));
        assertEquals("https://cdn.example/result.png", service.execute(dto).getOutput().get("assetUrl"));
    }

    @Test
    void effectIsPassedToVideoAsCreativeTextNotAsPreviewFootage() {
        VideoGenerationClient effectAwareVideo = prompt -> {
            assertTrue(prompt.contains("产品视频"));
            assertTrue(prompt.contains("镜头缓慢环绕30度"));
            assertFalse(prompt.contains("preview.mp4"));
            return "https://cdn.example/result.mp4";
        };
        var service = new WorkflowProviderGatewayServiceImpl(llm, music, image, effectAwareVideo, editor, tts, null, null);
        var dto = request("video", Map.of("prompt", "产品视频"));
        dto.setInputs(Map.of("upstream", Map.of("effect", Map.of(
            "resource", "镜头缓慢环绕30度", "templateOnly", true, "assetUrls", List.of(),
            "resourcePreviewVideoUrl", "https://cdn.example/preview.mp4"
        ))));
        assertEquals("https://cdn.example/result.mp4", service.execute(dto).getOutput().get("assetUrl"));
    }

    private WorkflowProviderGatewayServiceImpl service() {
        return new WorkflowProviderGatewayServiceImpl(llm, music, image, video, editor, tts, null, null);
    }

    private WorkflowProviderExecuteDTO request(String kind, Map<String, Object> config) {
        WorkflowProviderExecuteDTO dto = new WorkflowProviderExecuteDTO();
        dto.setTenantId(1);
        dto.setRunId("10");
        dto.setNodeId("node-1");
        dto.setNodeKind(kind);
        dto.setConfig(config);
        dto.setInputs(Map.of("upstream", Map.of()));
        return dto;
    }
}
