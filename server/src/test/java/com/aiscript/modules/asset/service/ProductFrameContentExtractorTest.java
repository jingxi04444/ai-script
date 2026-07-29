package com.aiscript.modules.asset.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ProductFrameContentExtractorTest {
    private final ProductFrameContentExtractor extractor = new ProductFrameContentExtractor(file -> "图片文字");

    @Test
    void extractsUtf8CsvAsMarkdownForModelContext() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "产品画面.csv",
            "text/csv",
            "镜号,画面,卖点\n1,\"产品特写,正面\",纤薄机身".getBytes(StandardCharsets.UTF_8)
        );

        String content = extractor.extract(file);

        assertThat(content)
            .contains("| 镜号 | 画面 | 卖点 |")
            .contains("| 1 | 产品特写,正面 | 纤薄机身 |");
    }

    @Test
    void fallsBackToGb18030ForChineseCsv() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "产品画面.csv",
            "text/csv",
            "镜号,画面\n1,厨房场景".getBytes(Charset.forName("GB18030"))
        );

        assertThat(extractor.extract(file)).contains("厨房场景");
    }

    @Test
    void delegatesImageContentToOcr() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "产品画面.png",
            "image/png",
            new byte[] {1, 2, 3}
        );

        assertThat(extractor.extract(file)).isEqualTo("图片文字");
    }
}
