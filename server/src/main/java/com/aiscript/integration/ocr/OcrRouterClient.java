package com.aiscript.integration.ocr;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Primary
@Component
public class OcrRouterClient implements OcrClient {
    private final OcrProperties properties;
    private final AliyunTraditionalOcrClient aliyunOcrClient;
    private final TesseractOcrClient tesseractOcrClient;

    public OcrRouterClient(
        OcrProperties properties,
        AliyunTraditionalOcrClient aliyunOcrClient,
        TesseractOcrClient tesseractOcrClient
    ) {
        this.properties = properties;
        this.aliyunOcrClient = aliyunOcrClient;
        this.tesseractOcrClient = tesseractOcrClient;
    }

    @Override
    public String recognize(MultipartFile file) {
        if (!properties.isEnabled()) {
            return null;
        }
        if (!"aliyun".equalsIgnoreCase(properties.getProvider())) {
            return tesseractOcrClient.recognize(file);
        }

        String text = aliyunOcrClient.recognize(file);
        if (StringUtils.hasText(text) || !properties.isFallbackToTesseract()) {
            return text;
        }
        return tesseractOcrClient.recognize(file);
    }
}
