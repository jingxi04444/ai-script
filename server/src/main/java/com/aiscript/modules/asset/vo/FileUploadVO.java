package com.aiscript.modules.asset.vo;

import lombok.Data;

@Data
public class FileUploadVO {
    private String objectKey;
    private String url;
    private String fileName;
    private String contentType;
    private Long size;
    private String extractedText;
}
