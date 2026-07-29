package com.aiscript.integration.ocr;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.ocr")
public class OcrProperties {
    private boolean enabled = true;
    private String provider = "aliyun";
    private boolean fallbackToTesseract = true;
    private String command = "tesseract";
    private String language = "chi_sim+eng";
    private int pageSegmentationMode = 6;
    private long timeoutSeconds = 30;
    private int maxTextLength = 30000;
    private Aliyun aliyun = new Aliyun();

    @Data
    public static class Aliyun {
        private String accessKeyId;
        private String accessKeySecret;
        private String endpoint = "ocr-api.cn-hangzhou.aliyuncs.com";
        private String regionId = "cn-hangzhou";
        private int connectTimeoutMillis = 5000;
        private int readTimeoutMillis = 30000;
        private long maxFileSizeBytes = 10 * 1024 * 1024;
    }
}
