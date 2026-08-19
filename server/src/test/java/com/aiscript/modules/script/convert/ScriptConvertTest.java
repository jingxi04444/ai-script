package com.aiscript.modules.script.convert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.aiscript.modules.script.entity.AiScriptTemplate;
import com.aiscript.modules.script.vo.AdminScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class ScriptConvertTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void publicTemplateOnlyExposesPreviewVideo() throws Exception {
        AiScriptTemplate template = new AiScriptTemplate();
        template.setId(9);
        template.setTemplateName("示例模板");
        template.setPreviewVideoUrl("https://cdn.example.com/preview.mp4");
        template.setFullVideoUrl("https://cdn.example.com/full.mp4");
        template.setReferenceUrl("https://source.example.com/original");
        template.setReferenceDesc("仅后台可见");

        ScriptTemplateVO publicTemplate = ScriptConvert.toTemplateVO(template);
        String publicJson = objectMapper.writeValueAsString(publicTemplate);

        assertEquals("https://cdn.example.com/preview.mp4", publicTemplate.getPreviewVideoUrl());
        assertTrue(publicJson.contains("previewVideoUrl"));
        assertFalse(publicJson.contains("fullVideoUrl"));
        assertFalse(publicJson.contains("referenceUrl"));
        assertFalse(publicJson.contains("referenceDesc"));

        AdminScriptTemplateVO adminTemplate = ScriptConvert.toAdminTemplateVO(template);
        assertEquals("https://cdn.example.com/full.mp4", adminTemplate.getFullVideoUrl());
        assertEquals("https://source.example.com/original", adminTemplate.getReferenceUrl());
    }

    @Test
    void scriptDetailExposesGenerationSourceSnapshot() {
        AiStoryboardScript script = new AiStoryboardScript();
        script.setId(17);
        script.setProjectId(9);
        script.setScriptName("千川产品介绍");
        script.setScriptType("original");
        script.setGenerationDuration("20-30秒内");
        script.setGenerationFormat("product-storyboard");
        script.setGenerationFormatName("产品类分镜脚本表");
        script.setGenerationTemplateId(3);
        script.setGenerationTemplateName("痛点解决型");
        script.setGenerationOriginalCategoryId("qianchuan");
        script.setGenerationOriginalCategoryName("千川信息流");
        script.setGenerationOriginalScenarioId("product-intro");
        script.setGenerationOriginalScenarioName("产品介绍口播");
        script.setStatus("draft");

        ScriptVO vo = ScriptConvert.toScriptVO(script);

        assertEquals("3", vo.getTemplateId());
        assertEquals("痛点解决型", vo.getTemplateName());
        assertEquals("千川信息流", vo.getOriginalCategoryName());
        assertEquals("产品介绍口播", vo.getOriginalScenarioName());
        assertEquals("20-30秒内", vo.getDuration());
        assertEquals("产品类分镜脚本表", vo.getFormatName());
    }
}
