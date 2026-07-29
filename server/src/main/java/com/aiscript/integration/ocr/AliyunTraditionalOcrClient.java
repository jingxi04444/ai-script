package com.aiscript.integration.ocr;

import com.aiscript.common.util.JsonUtils;
import com.aliyun.ocr_api20210707.Client;
import com.aliyun.ocr_api20210707.models.RecognizeBasicRequest;
import com.aliyun.ocr_api20210707.models.RecognizeBasicResponse;
import com.aliyun.ocr_api20210707.models.RecognizeBasicResponseBody;
import com.aliyun.teaopenapi.models.Config;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
public class AliyunTraditionalOcrClient {
    private final OcrProperties properties;

    public AliyunTraditionalOcrClient(OcrProperties properties) {
        this.properties = properties;
    }

    public String recognize(MultipartFile file) {
        OcrProperties.Aliyun aliyun = properties.getAliyun();
        if (!isConfigured() || file == null || file.isEmpty()) {
            return null;
        }
        if (file.getSize() > Math.max(1, aliyun.getMaxFileSizeBytes())) {
            log.warn("图片超过阿里云 OCR 大小限制，文件={}，size={}", file.getOriginalFilename(), file.getSize());
            return null;
        }

        try {
            Config config = new Config()
                .setAccessKeyId(aliyun.getAccessKeyId())
                .setAccessKeySecret(aliyun.getAccessKeySecret())
                .setEndpoint(aliyun.getEndpoint())
                .setRegionId(aliyun.getRegionId())
                .setConnectTimeout(Math.max(1000, aliyun.getConnectTimeoutMillis()))
                .setReadTimeout(Math.max(1000, aliyun.getReadTimeoutMillis()));
            Client client = new Client(config);
            RecognizeBasicRequest request = new RecognizeBasicRequest()
                .setBody(file.getInputStream())
                .setNeedRotate(true);
            RecognizeBasicResponse response = client.recognizeBasic(request);
            RecognizeBasicResponseBody body = response == null ? null : response.getBody();
            String text = extractRecognizedText(body == null ? null : body.getData());
            if (!StringUtils.hasText(text)) {
                log.warn(
                    "阿里云 OCR 未返回文字，文件={}，code={}，message={}",
                    file.getOriginalFilename(),
                    body == null ? null : body.getCode(),
                    body == null ? null : body.getMessage()
                );
                return null;
            }
            return trimText(text);
        } catch (Exception ex) {
            log.warn("阿里云传统 OCR 调用失败，文件={}，原因={}", file.getOriginalFilename(), ex.getMessage());
            return null;
        }
    }

    public boolean isConfigured() {
        OcrProperties.Aliyun aliyun = properties.getAliyun();
        return aliyun != null
            && StringUtils.hasText(aliyun.getAccessKeyId())
            && StringUtils.hasText(aliyun.getAccessKeySecret())
            && StringUtils.hasText(aliyun.getEndpoint());
    }

    String extractRecognizedText(String responseData) {
        Map<String, Object> data = JsonUtils.toMap(responseData);
        Object content = data.get("content");
        if (content instanceof String contentText && StringUtils.hasText(contentText)) {
            return contentText;
        }
        Object wordsInfo = data.get("prism_wordsInfo");
        if (!(wordsInfo instanceof List<?> words)) {
            return null;
        }
        return words.stream()
            .filter(Map.class::isInstance)
            .map(Map.class::cast)
            .map(item -> item.get("word"))
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .filter(StringUtils::hasText)
            .reduce((left, right) -> left + "\n" + right)
            .orElse(null);
    }

    private String trimText(String text) {
        String normalized = text.trim();
        int maxLength = Math.max(1, properties.getMaxTextLength());
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }
}
