package com.aiscript.integration.ocr;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AliyunTraditionalOcrClientTest {
    @Test
    void extractsContentFromAliyunResponseData() {
        AliyunTraditionalOcrClient client = new AliyunTraditionalOcrClient(new OcrProperties());

        String text = client.extractRecognizedText("""
            {
              "content": "330mm纤薄机身\\n齐平橱柜",
              "prism_wordsInfo": []
            }
            """);

        assertThat(text).isEqualTo("330mm纤薄机身\n齐平橱柜");
    }

    @Test
    void fallsBackToWordBlocksWhenContentIsMissing() {
        AliyunTraditionalOcrClient client = new AliyunTraditionalOcrClient(new OcrProperties());

        String text = client.extractRecognizedText("""
            {
              "prism_wordsInfo": [
                {"word": "大吸力"},
                {"word": "低噪音"}
              ]
            }
            """);

        assertThat(text).isEqualTo("大吸力\n低噪音");
    }
}
