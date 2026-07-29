package com.aiscript.integration.ocr;

import org.springframework.web.multipart.MultipartFile;

public interface OcrClient {
    String recognize(MultipartFile file);
}
