package com.aiscript.modules.brief.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiscript.common.util.JsonUtils;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.modules.brief.vo.BriefVersionVO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

class BriefDocumentServiceImplTest {
    private final BriefDocumentServiceImpl service = new BriefDocumentServiceImpl();

    @Test
    void createsRealDocxWithPlainTextFromSelectedVersion() throws IOException {
        BriefVO brief = sampleBrief();

        byte[] content = service.createDocx(brief, "version-1");

        assertThat(content).startsWith(0x50, 0x4b);
        assertThat(zipEntries(content)).contains(
            "[Content_Types].xml",
            "word/document.xml",
            "word/styles.xml",
            "docProps/core.xml"
        );

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            String text = extractor.getText();
            assertThat(text)
                .contains("测试按摩椅 Brief")
                .contains("版本：v1.0")
                .contains("AI 可读摘要")
                .contains("产品型号：A60 MAX")
                .contains("目标人群：久坐办公族\n运动恢复人群")
                .contains("产品主要卖点：真 4D 机芯\n柔性导轨")
                .contains("结构化 Brief")
                .doesNotContain("<p>", "<strong>", "<br");
            assertThat(document.getTables()).hasSize(1);
            assertThat(document.getTables().get(0).getRows()).hasSize(9);
        }

        String previewPath = System.getProperty("brief.docx.preview");
        if (previewPath != null && !previewPath.isBlank()) {
            Files.write(Path.of(previewPath), content);
        }
    }

    @Test
    void fallsBackToLatestVersionWhenRequestedVersionDoesNotExist() throws IOException {
        byte[] content = service.createDocx(sampleBrief(), "missing-version");

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content));
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            assertThat(extractor.getText())
                .contains("最新版本产品 Brief")
                .contains("版本：v2.0");
        }
    }

    private BriefVO sampleBrief() {
        BriefVO brief = new BriefVO();
        brief.setId("1001");
        brief.setName("当前 Brief");
        brief.setProductName("当前产品");
        brief.setUpdatedAt("2026-08-18 15:30:00");

        BriefVersionVO latest = version(
            "version-2",
            "v2.0",
            "2026-08-18 15:30:00",
            Map.of("briefName", "最新 Brief", "productName", "最新版本产品")
        );
        BriefVersionVO selected = version(
            "version-1",
            "v1.0",
            "2026-08-17 12:00:00",
            Map.ofEntries(
                Map.entry("briefName", "测试按摩椅 Brief"),
                Map.entry("productName", "测试按摩椅"),
                Map.entry("productModel", "A60 MAX"),
                Map.entry("price", "11900 元"),
                Map.entry("slogan", "万元级专业拉伸按摩椅"),
                Map.entry("targetAudience", "旧目标人群"),
                Map.entry("targetScene", "行业首款双拉伸按摩椅"),
                Map.entry("primarySellingPoint", "旧主要卖点"),
                Map.entry("otherRequirements", "加热与蓝牙音箱"),
                Map.entry("briefContent", "用于客厅追剧、运动后恢复和父母养生。"),
                Map.entry("richContent", JsonUtils.toJson(Map.of(
                    "audience", "<p>久坐办公族</p><p>运动恢复人群</p>",
                    "features", "<div>行业首款<strong>双拉伸</strong>按摩椅</div>",
                    "mainPoints", "<p>真 4D 机芯<br>柔性导轨</p>",
                    "secondaryPoints", "<p>加热 &amp; 蓝牙音箱</p>"
                )))
            )
        );
        brief.setVersions(List.of(latest, selected));
        return brief;
    }

    private BriefVersionVO version(String id, String label, String createdAt, Map<String, Object> snapshot) {
        BriefVersionVO version = new BriefVersionVO();
        version.setId(id);
        version.setLabel(label);
        version.setCreatedAt(createdAt);
        version.setContent(JsonUtils.toJson(snapshot));
        return version;
    }

    private List<String> zipEntries(byte[] content) throws IOException {
        java.util.ArrayList<String> entries = new java.util.ArrayList<>();
        try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) entries.add(entry.getName());
        }
        return entries;
    }
}
