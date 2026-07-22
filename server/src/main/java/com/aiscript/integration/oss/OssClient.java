package com.aiscript.integration.oss;

import java.io.InputStream;

public interface OssClient {
    String upload(String objectKey, InputStream inputStream, long size, String contentType);
}
