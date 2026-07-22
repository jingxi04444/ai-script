package com.aiscript.integration.oss;

import java.io.InputStream;
import org.springframework.stereotype.Component;

@Component
public class DefaultOssClient implements OssClient {
    @Override
    public String upload(String objectKey, InputStream inputStream, long size, String contentType) {
        return objectKey;
    }
}
